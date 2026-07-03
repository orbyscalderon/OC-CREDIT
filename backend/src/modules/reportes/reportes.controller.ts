import {
  Controller, Get, Header, Param, ParseUUIDPipe,
  Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { MoraService } from '../mora/mora.service';
import { PlanesService } from '../planes/planes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Reportes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reportes', version: '1' })
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly moraService: MoraService,
    private readonly planesService: PlanesService,
  ) {}

  @Get('uso-plan')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Uso actual del plan SaaS' })
  usoPlan(@CurrentUser() user: JwtPayload) {
    return this.planesService.getUsoTenant(user.tenantId);
  }

  @Get('dashboard')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Dashboard principal del Admin' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.service.dashboardAdmin(user.tenantId);
  }

  @Get('aging')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Aging de cartera' })
  aging(@CurrentUser() user: JwtPayload) {
    return this.service.aging(user.tenantId);
  }

  @Get('cobrador/:cobradorId')
  @Roles(Rol.ADMIN_TENANT)
  @ApiQuery({ name: 'desde', required: true })
  @ApiQuery({ name: 'hasta', required: true })
  cobrador(
    @CurrentUser() user: JwtPayload,
    @Param('cobradorId', ParseUUIDPipe) cobradorId: string,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.service.reporteCobrador(user.tenantId, cobradorId, desde, hasta);
  }

  @Get('prestamo/:id/historial')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({ summary: 'Historial de pagos de un préstamo' })
  historial(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.historialCobros(user.tenantId, id);
  }

  @Get('arqueos')
  @Roles(Rol.ADMIN_TENANT)
  @ApiQuery({ name: 'fecha', required: false })
  arqueos(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.arqueosDia(user.tenantId, fecha);
  }

  @Get('mora/resumen')
  @Roles(Rol.ADMIN_TENANT)
  moraSesumen(@CurrentUser() user: JwtPayload) {
    return this.moraService.resumenMoraTenant(user.tenantId);
  }

  /** Cuentas por cobrar — préstamos activos con cuota más antigua pendiente */
  @Get('cuentas-cobrar')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Cuentas por cobrar — todos los préstamos con saldo pendiente' })
  @ApiQuery({ name: 'solo_vencidos', required: false })
  cuentasCobrar(
    @CurrentUser() user: JwtPayload,
    @Query('solo_vencidos') soloVencidos?: string,
  ) {
    return this.service.cuentasCobrar(user.tenantId, soloVencidos === 'true');
  }

  /** Notificaciones in-app — mora, cuotas próximas a vencer */
  @Get('notificaciones')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({ summary: 'Alertas: cuotas vencidas, mora, clientes pendientes' })
  notificaciones(@CurrentUser() user: JwtPayload) {
    return this.service.notificaciones(user.tenantId);
  }

  /** Copia de seguridad — exporta datos del tenant en CSV dentro de un JSON */
  @Get('backup')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Exportar copia de seguridad de datos del tenant' })
  @Header('Content-Type', 'application/json')
  backup(@CurrentUser() user: JwtPayload) {
    return this.service.generarBackup(user.tenantId);
  }

  /** Reporte de ingresos mensual (Capital + Interés + Mora) */
  @Get('ingresos-mensuales')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Ingresos mensuales: capital cobrado, interés y mora' })
  ingresosMensuales(@CurrentUser() user: JwtPayload) {
    return this.service.ingresosMensuales(user.tenantId);
  }
}
