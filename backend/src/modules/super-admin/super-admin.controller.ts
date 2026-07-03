import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post,
  ParseUUIDPipe, UseGuards, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuperAdminJwtGuard } from '../../common/guards/super-admin-jwt.guard';
import { CurrentSuperAdmin } from '../../common/decorators/current-super-admin.decorator';
import { SuperAdminService } from './super-admin.service';
import type { SuperAdminJwtPayload } from './super-admin-auth.service';
import { BuroCreditoService } from '../buro-credito/buro-credito.service';
import { InactivarReporteBuroDto } from '../buro-credito/dto/buro.dto';

/**
 * Panel exclusivo de OC Moon Group LLC
 * Protegido por JWT propio de super-admin (ver SuperAdminAuthController para login)
 */
@ApiTags('Super Admin — OC Moon Group')
@ApiBearerAuth('SuperAdminJWT')
@UseGuards(SuperAdminJwtGuard)
@Controller({ path: 'super-admin', version: '1' })
export class SuperAdminController {
  constructor(
    private readonly svc: SuperAdminService,
    private readonly buroSvc: BuroCreditoService,
  ) {}

  /** Resumen global de la plataforma */
  @Get('dashboard')
  @ApiOperation({ summary: 'KPIs globales: tenants, ingresos MRR, préstamos totales' })
  dashboard() {
    return this.svc.dashboardGlobal();
  }

  /** Lista todos los tenants con su uso */
  @Get('tenants')
  @ApiOperation({ summary: 'Listar todos los tenants con uso del plan' })
  tenants(
    @Query('page') page = 1,
    @Query('limit') limit = 30,
  ) {
    return this.svc.listarTenants(+page, +limit);
  }

  /** Detalle de un tenant */
  @Get('tenants/:id')
  @ApiOperation({ summary: 'Ver detalle de un tenant' })
  tenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.detalleTenant(id);
  }

  /** Cambiar plan de un tenant */
  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Cambiar plan de un tenant' })
  cambiarPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { plan_id: string },
  ) {
    return this.svc.cambiarPlan(id, dto.plan_id);
  }

  /** Bloquear / desbloquear tenant */
  @Patch('tenants/:id/activo')
  @ApiOperation({ summary: 'Activar o desactivar un tenant' })
  toggleActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { activo: boolean; motivo?: string },
  ) {
    return this.svc.toggleActivo(id, dto.activo, dto.motivo);
  }

  /** MRR por mes (últimos 12 meses) */
  @Get('mrr')
  @ApiOperation({ summary: 'Monthly Recurring Revenue histórico' })
  mrr() {
    return this.svc.mrrHistorico();
  }

  /** Inactivar reporte de buró por error o resolución legal — acción cross-tenant, solo plataforma */
  @Post('buro/inactivar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inactivar reporte de buró de crédito (cualquier tenant)' })
  inactivarReporteBuro(
    @CurrentSuperAdmin() admin: SuperAdminJwtPayload,
    @Body() dto: InactivarReporteBuroDto,
  ) {
    return this.buroSvc.inactivarReporte(dto, admin.email);
  }
}
