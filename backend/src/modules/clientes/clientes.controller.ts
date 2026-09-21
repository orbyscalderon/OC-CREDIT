import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Post, Put, Query, Res, UploadedFiles, UseGuards, UseInterceptors,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Response as ExpressResponse } from 'express';
import { ClientesService } from './clientes.service';
import { CrearClienteDto, ActualizarClienteDto, ReordenarClientesDto } from './dto/cliente.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';
import { Permiso } from '../../common/constants/permisos.enum';

@ApiTags('Clientes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'clientes', version: '1' })
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @RequierePermiso(Permiso.CLIENTES_VER)
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
  @RequierePermiso(Permiso.CLIENTES_CREAR)
  @ApiOperation({ summary: 'Registrar nuevo cliente' })
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearClienteDto) {
    return this.service.crear(user.tenantId, dto);
  }

  @Get('buscar')
  @RequierePermiso(Permiso.CLIENTES_VER, Permiso.CLIENTES_CREAR, Permiso.PRESTAMOS_SOLICITAR)
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
  @RequierePermiso(Permiso.RUTAS_VER_PROPIA, Permiso.CLIENTES_VER)
  @ApiOperation({ summary: 'Clientes de una ruta ordenados por orden_visita (App Móvil)' })
  porRuta(
    @CurrentUser() user: JwtPayload,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.obtenerPorRuta(user.tenantId, rutaId);
  }

  @Put('ruta/:rutaId/orden')
  @RequierePermiso(Permiso.CLIENTES_EDITAR)
  @ApiOperation({ summary: 'Guardar el orden de visita de todos los clientes de una ruta (drag-and-drop)' })
  reordenar(
    @CurrentUser() user: JwtPayload,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
    @Body() dto: ReordenarClientesDto,
  ) {
    return this.service.reordenar(user.tenantId, rutaId, dto.orden);
  }

  @Post('ruta/:rutaId/orden/auto')
  @RequierePermiso(Permiso.CLIENTES_EDITAR)
  @ApiOperation({ summary: 'Reordenar automáticamente los clientes de una ruta por cercanía geográfica' })
  ordenarAutomatico(
    @CurrentUser() user: JwtPayload,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.ordenarAutomatico(user.tenantId, rutaId);
  }

  @Get(':id')
  @RequierePermiso(Permiso.CLIENTES_VER, Permiso.RUTAS_VER_PROPIA)
  uno(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.obtener(user.tenantId, id);
  }

  @Put(':id')
  @RequierePermiso(Permiso.CLIENTES_EDITAR)
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.service.actualizar(user.tenantId, id, dto);
  }

  @Put(':id/reasignar-ruta/:rutaId')
  @RequierePermiso(Permiso.CLIENTES_EDITAR)
  @ApiOperation({ summary: 'Reasignar cliente a una ruta diferente' })
  reasignar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rutaId', ParseUUIDPipe) rutaId: string,
  ) {
    return this.service.reasignarRuta(user.tenantId, id, rutaId);
  }

  @Post(':id/cedula')
  @RequierePermiso(Permiso.CLIENTES_EDITAR)
  @ApiOperation({ summary: 'Subir fotos de cédula (frontal y/o trasera)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor(
    [{ name: 'frontal', maxCount: 1 }, { name: 'trasera', maxCount: 1 }],
    {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo se aceptan imágenes'), false);
      },
    },
  ))
  subirCedula(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: { frontal?: Express.Multer.File[]; trasera?: Express.Multer.File[] },
  ) {
    const frontal = files.frontal?.[0];
    const trasera = files.trasera?.[0];
    return this.service.subirFotosCedula(
      user.tenantId, id,
      frontal ? { buffer: frontal.buffer, mimetype: frontal.mimetype } : undefined,
      trasera ? { buffer: trasera.buffer, mimetype: trasera.mimetype } : undefined,
    );
  }

  @Get(':id/cedula/:lado')
  @RequierePermiso(Permiso.CLIENTES_VER, Permiso.RUTAS_VER_PROPIA)
  @ApiOperation({ summary: 'Ver foto de cédula (frontal o trasera)' })
  async verCedula(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lado') lado: string,
    @Res() res: ExpressResponse,
  ) {
    const url = await this.service.urlFotoCedula(user.tenantId, id, lado === 'frontal' ? 'frontal' : 'trasera');
    res.redirect(url);
  }
}
