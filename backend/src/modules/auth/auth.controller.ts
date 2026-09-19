import { Body, Controller, HttpCode, HttpStatus, Post, Res, Get, UseGuards, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

const COOKIE_NAME = 'oc_token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 h — igual que JWT_EXPIRATION

// Frontend (Cloudflare) y backend (Railway) viven en dominios distintos en
// producción -> la cookie es cross-site, así que necesita SameSite=None
// (que a su vez exige Secure) para que el navegador la reenvíe. En
// desarrollo local el proxy de Vite hace que sea same-origin, así que Lax
// basta y no requiere HTTPS.
function cookieOptions(isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/api',
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión — token en cookie HttpOnly + datos del usuario en body' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, usuario, tenant_config } = await this.authService.login(dto);

    res.cookie(COOKIE_NAME, access_token, cookieOptions(this.config.get('NODE_ENV') === 'production'));

    // El panel web usa la cookie HttpOnly (nunca lee access_token del body).
    // La app móvil no puede depender de cookies entre sesiones, así que
    // también recibe el token en el body para guardarlo como Bearer.
    return { access_token, usuario, tenant_config };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión con Google — verifica ID token y establece cookie HttpOnly' })
  async loginGoogle(
    @Body() body: { credential: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, usuario, tenant_config } = await this.authService.loginWithGoogle(body.credential);

    res.cookie(COOKIE_NAME, access_token, cookieOptions(this.config.get('NODE_ENV') === 'production'));

    // Igual que /auth/login: el panel web usa solo la cookie, pero la app
    // móvil (sin cookies entre sesiones) necesita el token en el body para
    // guardarlo como Bearer — antes solo /auth/login lo hacía, dejando el
    // login con Google inutilizable desde mobile.
    return { access_token, usuario, tenant_config };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Devuelve los datos del usuario autenticado (útil tras OAuth redirect)' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('cambiar-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cambiar contraseña propia (usuario logueado)' })
  async cambiarPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { password_actual: string; nueva_password: string },
  ) {
    return this.authService.cambiarPassword(user.sub, dto.password_actual, dto.nueva_password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Cerrar sesión y limpiar cookie' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub);
    res.clearCookie(COOKIE_NAME, { path: '/api' });
  }
}
