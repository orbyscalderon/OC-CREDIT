import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RutasService } from './rutas.service';
import { CrearRutaDto, RegistrarNovedadDto, ToggleActivaRutaDto } from './dto/rutas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permiso } from '../../common/constants/permisos.enum';

@ApiTags('Rutas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'rutas', version: '1' })
export class RutasController {
  constructor(private readonly service: RutasService) {}

  @Post()
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiOperation({ summary: 'Crear ruta de cobranza' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearRutaDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Get()
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiQuery({ name: 'incluir_inactivas', required: false, type: Boolean })
  @ApiOperation({ summary: 'Listar rutas (por defecto solo activas; incluir_inactivas=true trae todas)' })
  listar(@CurrentUser() user: JwtPayload, @Query('incluir_inactivas') incluirInactivas?: string) {
    return this.service.listar(user.tenantId, incluirInactivas === 'true');
  }

  @Get('mis-rutas')
  @RequierePermiso(Permiso.RUTAS_VER_PROPIA)
  @ApiOperation({ summary: 'Rutas asignadas al cobrador autenticado' })
  misRutas(@CurrentUser() user: JwtPayload) {
    return this.service.listarDeCobrador(user.tenantId, user.empleadoId);
  }

  @Get(':id')
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiOperation({ summary: 'Obtener una ruta por id' })
  obtener(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.obtener(user.tenantId, id);
  }

  @Patch(':id/activa')
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiOperation({ summary: 'Activar o desactivar una ruta (no se elimina, conserva el historial asociado)' })
  toggleActiva(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleActivaRutaDto,
  ) {
    return this.service.toggleActiva(user.tenantId, id, dto.activa);
  }

  @Put(':id/asignar-cobrador/:cobradorId')
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiOperation({ summary: 'Asignar cobrador a una ruta' })
  asignar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('cobradorId', ParseUUIDPipe) cobradorId: string,
  ) {
    return this.service.asignarCobrador(user.tenantId, id, cobradorId, user);
  }

  @Get(':id/historial-cobrador')
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
  @ApiOperation({ summary: 'Historial de reasignaciones de cobrador de una ruta (auditoría)' })
  historialCobrador(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.historialCobrador(user.tenantId, id);
  }

  @Post('novedades')
  @RequierePermiso(Permiso.NOVEDADES_REGISTRAR)
  @ApiOperation({
    summary: 'Registrar novedad de ruta (cliente no estaba / sin dinero)',
    description:
      'GPS obligatorio. Se almacena para auditoría de visita física en el panel Admin.',
  })
  novedad(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarNovedadDto) {
    return this.service.registrarNovedad(user.tenantId, user.empleadoId, dto);
  }

  @Get('novedades/dia')
  @RequierePermiso(Permiso.NOVEDADES_VER)
  @ApiQuery({ name: 'fecha', required: false })
  @ApiOperation({ summary: 'Novedades del día (panel Admin)' })
  novedadesDia(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.novedadesDia(user.tenantId, fecha);
  }

  @Get('mapa/gps')
  @RequierePermiso(Permiso.RUTAS_GESTIONAR)
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
