import { Body, Controller, Delete, Get, Param, Put, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService, UpdateSettingsDto, CrearFeriadoDto } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  /* ── Settings ──────────────────────────────────────────────────────────── */

  @Get('settings')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Obtener configuración white-label del tenant' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.service.getSettings(user.tenantId);
  }

  @Put('settings')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Actualizar configuración white-label del tenant' })
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user.tenantId, dto);
  }

  /* ── Feriados ──────────────────────────────────────────────────────────── */

  @Get('feriados')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar feriados del tenant + feriados globales' })
  listarFeriados(@CurrentUser() user: JwtPayload) {
    return this.service.listarFeriados(user.tenantId);
  }

  @Post('feriados')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Agregar feriado para este tenant' })
  crearFeriado(@CurrentUser() user: JwtPayload, @Body() dto: CrearFeriadoDto) {
    return this.service.crearFeriado(user.tenantId, dto);
  }

  @Delete('feriados/:fecha')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Eliminar feriado de este tenant' })
  eliminarFeriado(@CurrentUser() user: JwtPayload, @Param('fecha') fecha: string) {
    return this.service.eliminarFeriado(user.tenantId, fecha);
  }
}
