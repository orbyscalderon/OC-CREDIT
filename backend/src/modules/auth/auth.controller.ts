import { Body, Controller, HttpCode, HttpStatus, Post, Res, Get, UseGuards } from '@nestjs/common';
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

    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    // El token NO va en el body — vive solo en la cookie HttpOnly
    return { usuario, tenant_config };
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

    res.cookie(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: COOKIE_MAX_AGE_MS,
    });

    return { usuario, tenant_config };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Devuelve los datos del usuario autenticado (útil tras OAuth redirect)' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
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
