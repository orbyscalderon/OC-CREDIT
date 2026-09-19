import {
  BadRequestException, Body, Controller, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseUUIDPipe, Post, Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Response as ExpressResponse } from 'express';
import { CobrosService } from './cobros.service';
import { RegistrarCobroDto, CobroResponseDto } from './dto/registrar-cobro.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/var/www/oc-credit/uploads';

@ApiTags('Cobros')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cobros', version: '1' })
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  /**
   * POST /api/v1/cobros/registrar
   *
   * Endpoint crítico. Registra un cobro de forma atómica:
   *  - Verifica idempotencia por UUID del dispositivo móvil
   *  - Aplica distribución en cascada: Mora → Interés → Capital
   *  - Actualiza estados de cuotas y préstamo dentro de una transacción SERIALIZABLE
   *  - Actualiza totales de la caja del cobrador
   */
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @Throttle({ short: { limit: 5, ttl: 1000 } }) // Máx 5 cobros/seg por cobrador
  @ApiOperation({
    summary: 'Registrar cobro en ruta (atómico + idempotente)',
    description:
      'Procesa el pago aplicando cascada de absorción: 1° Mora, 2° Interés, 3° Capital. ' +
      'El UUID del dispositivo garantiza que un cobro offline no se procese dos veces.',
  })
  @ApiResponse({ status: 201, type: CobroResponseDto, description: 'Cobro procesado exitosamente' })
  @ApiResponse({ status: 409, description: 'UUID duplicado — cobro ya fue procesado' })
  @ApiResponse({ status: 404, description: 'Préstamo o caja no encontrada' })
  @ApiResponse({ status: 403, description: 'Préstamo no asignado a este cobrador' })
  @ApiResponse({ status: 400, description: 'Préstamo sin cuotas pendientes' })
  registrar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarCobroDto,
  ): Promise<CobroResponseDto> {
    const esAdminUSupervisor = user.rol === Rol.ADMIN_TENANT || user.rol === Rol.SUPERVISOR_TENANT;
    return this.cobrosService.registrarCobro(
      user.tenantId,
      user.empleadoId,
      esAdminUSupervisor,
      dto,
    );
  }

  /**
   * GET /api/v1/cobros/caja/:cajaId
   * Lista los cobros realizados en una caja específica del cobrador autenticado.
   */
  @Get('caja/:cajaId')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Listar cobros de una caja' })
  @ApiParam({ name: 'cajaId', type: 'string', format: 'uuid' })
  getCobrosDeCaja(
    @CurrentUser() user: JwtPayload,
    @Param('cajaId', ParseUUIDPipe) cajaId: string,
  ) {
    return this.cobrosService.getCobrosDeCaja(
      user.tenantId,
      cajaId,
      user.empleadoId,
    );
  }

  /**
   * POST /api/v1/cobros/:id/foto
   * Sube la foto de evidencia de un cobro ya registrado. Va SEPARADA del
   * registro atómico del cobro (POST /cobros/registrar) a propósito: el
   * cobro en efectivo no debe bloquearse ni fallar por una foto que no
   * subió — el dinero ya quedó registrado y auditado por GPS+idempotencia
   * antes de siquiera intentar la foto.
   */
  @Post(':id/foto')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir foto de evidencia de un cobro' })
  @UseInterceptors(FileInterceptor('foto', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new BadRequestException('Solo se aceptan imágenes'), false);
    },
  }))
  subirFoto(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.cobrosService.subirFotoEvidencia(user.tenantId, id, file.buffer, file.originalname, UPLOADS_DIR);
  }

  /**
   * GET /api/v1/cobros/:id/foto
   * Sirve la foto de evidencia de un cobro (si existe).
   */
  @Get(':id/foto')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Ver foto de evidencia de un cobro' })
  async verFoto(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: ExpressResponse,
  ) {
    const relPath = await this.cobrosService.obtenerFotoEvidencia(user.tenantId, id);
    if (!relPath) throw new NotFoundException('Este cobro no tiene foto de evidencia');
    const absPath = path.join(UPLOADS_DIR, relPath);
    if (!fs.existsSync(absPath)) throw new NotFoundException('Archivo no encontrado en el servidor');
    res.sendFile(absPath);
  }
}
