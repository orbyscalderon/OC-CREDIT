import {
  Body, Controller, Delete, Get, Param, Put, Post, UseGuards,
  UseInterceptors, UploadedFile, Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService, UpdateSettingsDto, CrearFeriadoDto } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Permiso } from '../../common/constants/permisos.enum';
import { msg } from '../../common/i18n/messages';
import { StorageService } from '../../common/services/storage.service';

// Legado -- diskStorage previo escribía acá, filesystem efímero de Railway
// (se borraba en cada redeploy). Solo queda para servir un url_logo viejo
// con ruta relativa si alguno sobrevivió; toda subida nueva va a Supabase
// Storage (bucket público "logos", ver subirLogo()).
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/var/www/oc-credit/uploads';

const LOGO_BUCKET = 'logos';

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(
    private readonly service: TenantsService,
    private readonly storageService: StorageService,
  ) {}

  /* ── Settings ──────────────────────────────────────────────────────────── */

  @Get('settings')
  @RequierePermiso(Permiso.TENANT_VER_CONFIG)
  @ApiOperation({ summary: 'Obtener configuración white-label del tenant' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.service.getSettings(user.tenantId);
  }

  @Put('settings')
  @RequierePermiso(Permiso.TENANT_EDITAR_CONFIG)
  @ApiOperation({ summary: 'Actualizar configuración white-label del tenant' })
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user.tenantId, dto);
  }

  @Post('logo')
  @RequierePermiso(Permiso.TENANT_EDITAR_CONFIG)
  @ApiOperation({ summary: 'Subir logo del tenant (imagen) -- Supabase Storage, bucket público' })
  @UseInterceptors(FileInterceptor('logo', {
    storage: memoryStorage(),
    fileFilter: (_req, file, cb) => {
      // SVG queda fuera a propósito -- puede llevar <script> embebido, y el
      // bucket es público (cualquiera con la URL lo abre directo en el
      // navegador, fuera del <img> "seguro" que usa el panel).
      const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Formato no permitido. Usa PNG, JPG o WEBP'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async subirLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException(msg('tenants_archivo_no_recibido'));
    // Sufijo de tiempo: cada subida es un archivo nuevo, así el navegador
    // nunca sirve el logo viejo desde caché con la misma URL.
    const path = `${user.tenantId}-${Date.now()}${extname(file.originalname).toLowerCase()}`;
    await this.storageService.subir(path, file.buffer, file.mimetype, LOGO_BUCKET);
    const url = this.storageService.urlPublica(path, LOGO_BUCKET);
    await this.service.updateSettings(user.tenantId, { url_logo: url });
    return { url_logo: url };
  }

  /**
   * Legado: solo sirve un url_logo con ruta relativa vieja (disco local,
   * previo a Supabase Storage) si por algún motivo sobrevivió un redeploy.
   * Toda subida nueva devuelve URL pública absoluta y el frontend la usa
   * directo -- este endpoint deja de ser necesario para logos nuevos.
   */
  @Get('logo')
  @RequierePermiso(Permiso.TENANT_VER_CONFIG, Permiso.RUTAS_VER_PROPIA)
  @ApiOperation({ summary: 'Obtener logo del tenant (legado -- rutas locales viejas)' })
  async getLogo(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const settings = await this.service.getSettings(user.tenantId);
    if (!settings.url_logo || settings.url_logo.startsWith('http')) return res.status(404).send('Sin logo');
    const absPath = join(UPLOADS_DIR, settings.url_logo);
    if (!existsSync(absPath)) return res.status(404).send('Archivo no encontrado');
    res.sendFile(absPath);
  }

  /* ── Feriados ──────────────────────────────────────────────────────────── */

  @Get('feriados')
  @RequierePermiso(Permiso.TENANT_VER_CONFIG)
  @ApiOperation({ summary: 'Listar feriados del tenant + feriados globales' })
  listarFeriados(@CurrentUser() user: JwtPayload) {
    return this.service.listarFeriados(user.tenantId);
  }

  @Post('feriados')
  @RequierePermiso(Permiso.TENANT_EDITAR_CONFIG)
  @ApiOperation({ summary: 'Agregar feriado para este tenant' })
  crearFeriado(@CurrentUser() user: JwtPayload, @Body() dto: CrearFeriadoDto) {
    return this.service.crearFeriado(user.tenantId, dto);
  }

  @Delete('feriados/:fecha')
  @RequierePermiso(Permiso.TENANT_EDITAR_CONFIG)
  @ApiOperation({ summary: 'Eliminar feriado de este tenant' })
  eliminarFeriado(@CurrentUser() user: JwtPayload, @Param('fecha') fecha: string) {
    return this.service.eliminarFeriado(user.tenantId, fecha);
  }
}
