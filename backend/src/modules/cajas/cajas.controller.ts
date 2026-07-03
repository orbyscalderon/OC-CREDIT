import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CajasService } from './cajas.service';
import { AbrirCajaDto, CerrarCajaDto, RegistrarGastoDto } from './dto/cajas.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Cajas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cajas', version: '1' })
export class CajasController {
  constructor(private readonly service: CajasService) {}

  @Post('abrir')
  @Roles(Rol.COBRADOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Abrir caja del día (inicio de jornada)' })
  abrir(@CurrentUser() user: JwtPayload, @Body() dto: AbrirCajaDto) {
    return this.service.abrir(user.tenantId, user.empleadoId, dto);
  }

  @Post('cerrar')
  @HttpCode(HttpStatus.OK)
  @Roles(Rol.COBRADOR_TENANT, Rol.ADMIN_TENANT)
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
  @Roles(Rol.COBRADOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({
    summary: 'Registrar gasto de ruta (gasolina, reparación, etc.)',
    description:
      'Soporta modo offline. El monto afecta directamente el arqueo final de la caja.',
  })
  registrarGasto(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarGastoDto) {
    return this.service.registrarGasto(user.tenantId, user.empleadoId, dto);
  }

  @Get('activa')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiQuery({ name: 'ruta_id', required: false, description: 'Filtra a la caja activa de esa ruta. Sin filtro, devuelve todas las cajas activas del cobrador (puede tener una por ruta).' })
  @ApiOperation({ summary: 'Obtener caja(s) activa(s) del cobrador autenticado' })
  activa(@CurrentUser() user: JwtPayload, @Query('ruta_id') rutaId?: string) {
    return this.service.obtenerCajaActiva(user.tenantId, user.empleadoId, rutaId);
  }

  @Get('dia')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar todas las cajas de un día (panel Admin)' })
  @ApiQuery({ name: 'fecha', required: false, description: 'YYYY-MM-DD (defecto: hoy)' })
  dia(@CurrentUser() user: JwtPayload, @Query('fecha') fecha?: string) {
    return this.service.listarCajasDia(user.tenantId, fecha);
  }

  @Get(':id/arqueo')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
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
}
