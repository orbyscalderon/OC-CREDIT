import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Post, Put, Query, UseGuards, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CrearClienteDto, ActualizarClienteDto } from './dto/cliente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Clientes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'clientes', version: '1' })
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar clientes con paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, description: 'Búsqueda por nombre, apellido o cédula' })
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('q') q?: string,
  ) {
    return this.service.listar(user.tenantId, page, limit, q);
  }

  @Post()
  @Roles(Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Registrar nuevo cliente' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearClienteDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Get('buscar')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiQuery({ name: 'q', description: 'Nombre, apellido o cédula' })
  @ApiOperation({
    summary: 'Buscar clientes por nombre, apellido o cédula',
    description: 'Un cobrador solo ve clientes de sus propias rutas; admin/supervisor ven toda la cartera.',
  })
  async buscar(@CurrentUser() user: JwtPayload, @Query('q') q: string) {
    const rutaIds = user.rol === Rol.COBRADOR_TENANT
      ? await this.service.rutasDeCobrador(user.tenantId, user.empleadoId)
      : undefined;
    return this.service.buscarConBuro(user.tenantId, q ?? '', rutaIds);
  }

  @Get('ruta/:rutaId')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({ summary: 'Clientes de una ruta ordenados por orden_visita (App Móvil)' })
  porRuta(
    @CurrentUser() user: JwtPayload,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.obtenerPorRuta(user.tenantId, rutaId);
  }

  @Get(':id')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  uno(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.obtener(user.tenantId, id);
  }

  @Put(':id')
  @Roles(Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.service.actualizar(user.tenantId, id, dto);
  }

  @Put(':id/reasignar-ruta/:rutaId')
  @Roles(Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Reasignar cliente a una ruta diferente' })
  reasignar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.reasignarRuta(user.tenantId, id, rutaId);
  }
}
