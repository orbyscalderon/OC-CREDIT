import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CajasService } from './cajas.service';
import { AbrirCajaDto, CerrarCajaDto, RegistrarGastoDto } from './dto/cajas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';
import { Permiso } from '../../common/constants/permisos.enum';

@ApiTags('Cajas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'cajas', version: '1' })
export class CajasController {
  constructor(private readonly service: CajasService) {}

  @Post('abrir')
  @RequierePermiso(Permiso.CAJAS_SUPERVISAR)
  @ApiOperation({
    summary: 'Asignar/abrir la caja del día a un cobrador (inicio de jornada)',
    description: 'Solo Admin/Supervisor -- el cobrador no abre su propia caja, opera dentro de la que se le asignó.',
  })
  abrir(@CurrentUser() user: JwtPayload, @Body() dto: AbrirCajaDto) {
    return this.service.abrir(user.tenantId, dto.cobrador_id, dto);
  }

  @Post('cerrar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(Permiso.CAJAS_OPERAR)
  @ApiOperation({
    summary: 'Cierre ciego de caja',
    description:
      'El cobrador declara el monto físico que tiene. ' +
      'La diferencia con el monto esperado solo la ve el Administrador.',
  })
  cerrar(@CurrentUser() user: JwtPayload, @Body() dto: CerrarCajaDto) {
    return this.service.cerrar(user.tenantId, user.empleadoId, dto);
  }

  @Post('gastos')
  @RequierePermiso(Permiso.CAJAS_OPERAR)
  @ApiOperation({
    summary: 'Registrar gasto de ruta (gasolina, reparación, etc.)',
    description:
      'Soporta modo offline. El monto afecta directamente el arqueo final de la caja. ' +
      'Admin/supervisor pueden registrar en la caja de cualquier cobrador del tenant.',
  })
  registrarGasto(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarGastoDto) {
    const esAdminUSupervisor = user.rol === Rol.ADMIN_TENANT || user.rol === Rol.SUPERVISOR_TENANT;
    return this.service.registrarGasto(user.tenantId, user.empleadoId, dto, esAdminUSupervisor);
  }

  @Get('activa')
  @RequierePermiso(Permiso.CAJAS_OPERAR)
  @ApiQuery({ name: 'ruta_id', required: false, description: 'Filtra a la caja activa de esa ruta. Sin filtro, devuelve todas las cajas activas del cobrador (puede tener una por ruta).' })
  @ApiOperation({ summary: 'Obtener caja(s) activa(s) del cobrador autenticado' })
  activa(@CurrentUser() user: JwtPayload, @Query('ruta_id') rutaId?: string) {
    return this.service.obtenerCajaActiva(user.tenantId, user.empleadoId, rutaId);
  }

  @Get('dia')
  @RequierePermiso(Permiso.CAJAS_SUPERVISAR)
  @ApiOperation({ summary: 'Listar todas las cajas de un día (panel Admin)' })
  @ApiQuery({ name: 'fecha', required: false, description: 'YYYY-MM-DD (defecto: hoy)' })
  dia(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.listarCajasDia(user.tenantId, fecha);
  }

  @Get(':id/arqueo')
  @RequierePermiso(Permiso.CAJAS_OPERAR)
  @ApiOperation({
    summary: 'Arqueo detallado de una caja',
    description:
      'Admin ve: diferencia_cierre, monto_declarado, estado_cuadre. ' +
      'Cobrador ve: totales sin diferencia.',
  })
  arqueo(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.obtenerArqueo(user.tenantId, id, user);
  }

  @Get(':id/movimientos')
  @RequierePermiso(Permiso.CAJAS_OPERAR)
  @ApiOperation({ summary: 'Movimientos (cobros + gastos) de una caja, orden cronológico' })
  movimientos(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const esAdminUSupervisor = user.rol === Rol.ADMIN_TENANT || user.rol === Rol.SUPERVISOR_TENANT;
    return this.service.listarMovimientos(user.tenantId, id, user.empleadoId, esAdminUSupervisor);
  }
}
