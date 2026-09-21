import {
  Body, Controller, Get, Header, Param, ParseUUIDPipe,
  Post, Query, Res, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { MoraService } from '../mora/mora.service';
import { PlanesService } from '../planes/planes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Lang, Idioma } from '../../common/decorators/lang.decorator';
import { Permiso } from '../../common/constants/permisos.enum';

@ApiTags('Reportes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'reportes', version: '1' })
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly moraService: MoraService,
    private readonly planesService: PlanesService,
  ) {}

  @Get('uso-plan')
  @RequierePermiso(Permiso.REPORTES_AVANZADOS)
  @ApiOperation({ summary: 'Uso actual del plan SaaS' })
  usoPlan(@CurrentUser() user: JwtPayload) {
    return this.planesService.getUsoTenant(user.tenantId);
  }

  @Get('dashboard')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @ApiOperation({ summary: 'Dashboard principal del Admin' })
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.service.dashboardAdmin(user.tenantId);
  }

  @Get('aging')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @ApiOperation({ summary: 'Aging de cartera' })
  aging(@CurrentUser() user: JwtPayload) {
    return this.service.aging(user.tenantId);
  }

  @Get('cobrador/:cobradorId')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
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
  @RequierePermiso(Permiso.REPORTES_VER)
  @ApiOperation({ summary: 'Historial de pagos de un préstamo' })
  historial(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.historialCobros(user.tenantId, id);
  }

  @Get('arqueos')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @ApiQuery({ name: 'fecha', required: false })
  arqueos(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.arqueosDia(user.tenantId, fecha);
  }

  @Get('mora/resumen')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  moraSesumen(@CurrentUser() user: JwtPayload) {
    return this.moraService.resumenMoraTenant(user.tenantId);
  }

  /** Cuentas por cobrar — préstamos activos con cuota más antigua pendiente */
  @Get('cuentas-cobrar')
  @RequierePermiso(Permiso.REPORTES_AVANZADOS)
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
  @RequierePermiso(Permiso.REPORTES_VER)
  @ApiOperation({ summary: 'Alertas: cuotas vencidas, mora, clientes pendientes' })
  notificaciones(@CurrentUser() user: JwtPayload, @Lang() lang: Idioma) {
    return this.service.notificaciones(user.tenantId, lang);
  }

  /** Copia de seguridad — exporta datos del tenant en CSV dentro de un JSON */
  @Get('backup')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @ApiOperation({ summary: 'Exportar copia de seguridad de datos del tenant' })
  @Header('Content-Type', 'application/json')
  backup(@CurrentUser() user: JwtPayload) {
    return this.service.generarBackup(user.tenantId);
  }

  /** Restaura un backup (generado por GET /reportes/backup) dentro del mismo tenant */
  @Post('restaurar-backup')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @Throttle({ short: { limit: 2, ttl: 60_000 } })
  @ApiOperation({ summary: 'Restaura datos desde un backup -- solo inserta lo que falta, nunca pisa ni duplica' })
  restaurarBackup(@CurrentUser() user: JwtPayload, @Body() backup: any) {
    return this.service.restaurarBackup(user.tenantId, backup);
  }

  /** Reporte de ingresos mensual (Capital + Interés + Mora) */
  @Get('ingresos-mensuales')
  @RequierePermiso(Permiso.REPORTES_ADMIN)
  @ApiOperation({ summary: 'Ingresos mensuales: capital cobrado, interés y mora' })
  ingresosMensuales(@CurrentUser() user: JwtPayload) {
    return this.service.ingresosMensuales(user.tenantId);
  }
}
