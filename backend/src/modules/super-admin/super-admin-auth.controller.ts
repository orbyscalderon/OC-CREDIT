import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@ApiTags('Super Admin — OC Moon Group')
@Controller({ path: 'super-admin/auth', version: '1' })
export class SuperAdminAuthController {
  constructor(private readonly authService: SuperAdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login de Super Admin — devuelve JWT propio, separado del de los tenants' })
  login(@Body() dto: SuperAdminLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
