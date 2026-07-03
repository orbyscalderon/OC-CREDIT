import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RutasService } from './rutas.service';
import { CrearRutaDto, RegistrarNovedadDto, ToggleActivaRutaDto } from './dto/rutas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Rutas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'rutas', version: '1' })
export class RutasController {
  constructor(private readonly service: RutasService) {}

  @Post()
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Crear ruta de cobranza' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearRutaDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Get()
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiQuery({ name: 'incluir_inactivas', required: false, type: Boolean })
  @ApiOperation({ summary: 'Listar rutas (por defecto solo activas; incluir_inactivas=true trae todas)' })
  listar(@CurrentUser() user: JwtPayload, @Query('incluir_inactivas') incluirInactivas?: string) {
    return this.service.listar(user.tenantId, incluirInactivas === 'true');
  }

  @Get('mis-rutas')
  @Roles(Rol.COBRADOR_TENANT)
  @ApiOperation({ summary: 'Rutas asignadas al cobrador autenticado' })
  misRutas(@CurrentUser() user: JwtPayload) {
    return this.service.listarDeCobrador(user.tenantId, user.empleadoId);
  }

  @Get(':id')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Obtener una ruta por id' })
  obtener(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.obtener(user.tenantId, id);
  }

  @Patch(':id/activa')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Activar o desactivar una ruta (no se elimina, conserva el historial asociado)' })
  toggleActiva(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleActivaRutaDto,
  ) {
    return this.service.toggleActiva(user.tenantId, id, dto.activa);
  }

  @Put(':id/asignar-cobrador/:cobradorId')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Asignar cobrador a una ruta' })
  asignar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('cobradorId', ParseUUIDPipe) cobradorId: string,
  ) {
    return this.service.asignarCobrador(user.tenantId, id, cobradorId);
  }

  @Post('novedades')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Registrar novedad de ruta (cliente no estaba / sin dinero)',
    description:
      'GPS obligatorio. Se almacena para auditoría de visita física en el panel Admin.',
  })
  novedad(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarNovedadDto) {
    return this.service.registrarNovedad(user.tenantId, user.empleadoId, dto);
  }

  @Get('novedades/dia')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiQuery({ name: 'fecha', required: false })
  @ApiOperation({ summary: 'Novedades del día (panel Admin)' })
  novedadesDia(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.novedadesDia(user.tenantId, fecha);
  }

  @Get('mapa/gps')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiQuery({ name: 'fecha', required: false })
  @ApiQuery({ name: 'ruta_id', required: false })
  @ApiOperation({
    summary: 'Coordenadas GPS del día para renderizar en Leaflet / OpenStreetMap',
    description:
      'Retorna cobros y novedades con lat/lng. Sin ruta_id trae todo el tenant; ' +
      'con ruta_id filtra solo los eventos de esa ruta.',
  })
  gps(
    @CurrentUser() user: JwtPayload,
    @Query('fecha') fecha?: string,
    @Query('ruta_id') rutaId?: string,
  ) {
    return this.service.coordenadasGps(user.tenantId, fecha, rutaId);
  }
}
