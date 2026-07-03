import {
  Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { PrestamosService } from './prestamos.service';
import {
  AprobarPrestamoDto, CrearPrestamoDto,
  MarcarVencidoDto, RechazarPrestamoDto, RenovarPrestamoDto,
} from './dto/prestamo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Préstamos')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'prestamos', version: '1' })
export class PrestamosController {
  constructor(private readonly service: PrestamosService) {}

  @Get()
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({
    summary: 'Listar préstamos paginados (panel web)',
    description: 'Un cobrador solo ve sus propios préstamos asignados; admin/supervisor ven toda la cartera.',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'cliente_id', required: false })
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('estado') estado?: string,
    @Query('cliente_id') clienteId?: string,
  ) {
    // Si es cobrador, se ignora cualquier otro filtro de cobrador y se fuerza
    // el suyo — no puede pedir ver préstamos de otro cobrador cambiando query params.
    const cobradorId = user.rol === Rol.COBRADOR_TENANT ? user.empleadoId : undefined;
    return this.service.listar(user.tenantId, page, limit, estado, clienteId, cobradorId);
  }

  @Post('solicitar')
  @Roles(Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({
    summary: 'Crear solicitud de préstamo (estado Pendiente)',
    description:
      'Un cobrador puede crear la solicitud desde la calle, pero solo para una ruta ' +
      'que tenga asignada — admin/supervisor la aprueban después, igual que siempre.',
  })
  solicitar(@CurrentUser() user: JwtPayload, @Body() dto: CrearPrestamoDto) {
    const cobradorId = user.rol === Rol.COBRADOR_TENANT ? user.empleadoId : undefined;
    return this.service.crearSolicitud(user.tenantId, user.empleadoId, dto, cobradorId);
  }

  @Post(':id/aprobar')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Aprobar préstamo y generar plan de amortización (solo Admin)',
    description:
      'Al aprobar se generan automáticamente las cuotas omitiendo domingos y feriados.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async aprobar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprobarPrestamoDto,
  ) {
    const { prestamo, plan } = await this.service.aprobar(user.tenantId, user.empleadoId, id, dto);
    return this.service.mapPrestamo(prestamo, plan);
  }

  @Post(':id/rechazar')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Rechazar una solicitud de préstamo pendiente' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  rechazar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazarPrestamoDto,
  ) {
    return this.service.rechazar(user.tenantId, id, dto);
  }

  @Post('renovar')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Renovar (re-enganchar) préstamo activo de un cliente',
    description:
      'Liquida el saldo del préstamo anterior y crea uno nuevo. ' +
      'Entrega al cliente únicamente el diferencial (capital nuevo - saldo viejo). ' +
      'El préstamo anterior pasa a estado PagadoPorRenovación.',
  })
  renovar(@CurrentUser() user: JwtPayload, @Body() dto: RenovarPrestamoDto) {
    return this.service.renovar(user.tenantId, user.empleadoId, dto);
  }

  @Post('marcar-vencido')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Marcar préstamo como vencido y reportar automáticamente al buró de crédito',
    description:
      'Cierra forzosamente el préstamo. Si el cliente tiene cédula registrada y ' +
      'reportar_buro=true, se crea un registro PERMANENTE en el buró de crédito.',
  })
  marcarVencido(@CurrentUser() user: JwtPayload, @Body() dto: MarcarVencidoDto) {
    return this.service.marcarVencido(user.tenantId, dto);
  }

  @Get('ruta/:rutaId')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiParam({ name: 'rutaId', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Listar préstamos activos de una ruta (para App Móvil)' })
  porRuta(
    @CurrentUser() user: JwtPayload,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.listarPorRuta(user.tenantId, rutaId);
  }

  @Get(':id/cuotas')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Obtener préstamo con plan completo de cuotas' })
  cuotas(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.obtenerConCuotas(user.tenantId, id);
  }

  @Get(':id/saldo')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Resumen de saldo pendiente (cuotas + mora)' })
  saldo(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.obtenerResumenSaldo(user.tenantId, id);
  }

  @Get(':id')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Obtener préstamo con plan de cuotas (panel web)' })
  obtener(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const cobradorId = user.rol === Rol.COBRADOR_TENANT ? user.empleadoId : undefined;
    return this.service.obtener(user.tenantId, id, cobradorId);
  }
}
