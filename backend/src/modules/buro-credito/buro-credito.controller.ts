import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Inject, NotFoundException, Param, Post, Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiQuery,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuroCreditoService } from './buro-credito.service';
import {
  ConsultarBuroDto,
  MarcarDeudaSaldadaDto, PerfilBuroResponseDto,
  ReportarDeudorDto,
} from './dto/buro.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';
import { Tenant } from '../tenants/entities/tenant.entity';

@ApiTags('Buró de Crédito')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'buro', version: '1' })
export class BuroCreditoController {
  constructor(
    private readonly service: BuroCreditoService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async resolveTenantNombre(tenantId: string): Promise<string> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId }, select: ['nombre_empresa'] });
    return tenant?.nombre_empresa ?? tenantId;
  }

  @Post('consultar')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({
    summary: 'Consultar historial crediticio por cédula (cross-tenant)',
    description:
      'Retorna el perfil consolidado de mal crédito del cliente en TODAS las agencias del sistema. ' +
      'La consulta queda registrada en el log de auditoría del buró.',
  })
  @ApiResponse({ status: 200, type: PerfilBuroResponseDto })
  async consultar(
    @Body() dto: ConsultarBuroDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantNombre = await this.resolveTenantNombre(user.tenantId);
    return this.service.consultarPorCedula(dto, user, tenantNombre);
  }

  @Post('reportar')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({
    summary: 'Reportar cliente con mal crédito (PERMANENTE)',
    description:
      'Crea un registro permanente en el buró. El dato NO se borra aunque el tenant ' +
      'sea cancelado o el préstamo eliminado. Solo super_admin puede inactivarlo.',
  })
  async reportar(
    @Body() dto: ReportarDeudorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantNombre = await this.resolveTenantNombre(user.tenantId);
    const empleadoNombre = user.email;
    return this.service.reportarDeudor(dto, user, tenantNombre, empleadoNombre);
  }

  @Post('marcar-saldada')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({
    summary: 'Registrar que el deudor saldó su deuda',
    description:
      'El reporte permanece visible pero con flag deuda_saldada=true. ' +
      'El nivel de riesgo se reduce un nivel. La historia negativa no desaparece.',
  })
  marcarSaldada(
    @Body() dto: MarcarDeudaSaldadaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.marcarDeudaSaldada(dto, user);
  }

  @Get('mis-reportes')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar reportes de mal crédito emitidos por mi empresa' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  misReportes(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.obtenerReportesPropios(user.tenantId, +page, +limit);
  }

  @Get('estadisticas')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Estadísticas globales del buró (solo admin)' })
  estadisticas() {
    return this.service.estadisticasGlobales();
  }

  @Post('reporte-mensual')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Forzar el reporte mensual de atrasados de mi empresa (normalmente corre solo el último día del mes)',
    description:
      'Reporta al buró a todos los clientes con préstamos activos y mora pendiente. ' +
      'No cierra los préstamos — es un snapshot de control. No duplica reportes del mismo mes.',
  })
  reporteMensual(@CurrentUser() user: JwtPayload) {
    return this.service.reportarAtrasadosFinMes(user.tenantId);
  }
}
