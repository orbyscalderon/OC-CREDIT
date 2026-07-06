import {
  Body, Controller, Delete, Get, Param, Put, Post, UseGuards,
  UseInterceptors, UploadedFile, Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService, UpdateSettingsDto, CrearFeriadoDto } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/var/www/oc-credit/uploads';
const LOGOS_DIR   = join(UPLOADS_DIR, 'logos');

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });
    cb(null, LOGOS_DIR);
  },
  filename: (req: any, file, cb) => {
    const tenantId = req.user?.tenantId ?? 'unknown';
    cb(null, `${tenantId}${extname(file.originalname).toLowerCase()}`);
  },
});

@ApiTags('Tenants')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  /* ── Settings ──────────────────────────────────────────────────────────── */

  @Get('settings')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Obtener configuración white-label del tenant' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.service.getSettings(user.tenantId);
  }

  @Put('settings')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Actualizar configuración white-label del tenant' })
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user.tenantId, dto);
  }

  @Post('logo')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Subir logo del tenant (imagen)' })
  @UseInterceptors(FileInterceptor('logo', {
    storage: logoStorage,
    fileFilter: (_req, file, cb) => {
      const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Formato no permitido. Usa PNG, JPG, WEBP o SVG'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async subirLogo(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const relativePath = join('logos', file.filename).replace(/\\/g, '/');
    await this.service.updateSettings(user.tenantId, { url_logo: relativePath });
    return { url_logo: relativePath };
  }

  @Get('logo')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT, Rol.COBRADOR_TENANT)
  @ApiOperation({ summary: 'Obtener logo del tenant' })
  async getLogo(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const settings = await this.service.getSettings(user.tenantId);
    if (!settings.url_logo) return res.status(404).send('Sin logo');
    const absPath = join(UPLOADS_DIR, settings.url_logo);
    if (!existsSync(absPath)) return res.status(404).send('Archivo no encontrado');
    res.sendFile(absPath);
  }

  /* ── Feriados ──────────────────────────────────────────────────────────── */

  @Get('feriados')
  @Roles(Rol.ADMIN_TENANT, Rol.SUPERVISOR_TENANT)
  @ApiOperation({ summary: 'Listar feriados del tenant + feriados globales' })
  listarFeriados(@CurrentUser() user: JwtPayload) {
    return this.service.listarFeriados(user.tenantId);
  }

  @Post('feriados')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Agregar feriado para este tenant' })
  crearFeriado(@CurrentUser() user: JwtPayload, @Body() dto: CrearFeriadoDto) {
    return this.service.crearFeriado(user.tenantId, dto);
  }

  @Delete('feriados/:fecha')
  @Roles(Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Eliminar feriado de este tenant' })
  eliminarFeriado(@CurrentUser() user: JwtPayload, @Param('fecha') fecha: string) {
    return this.service.eliminarFeriado(user.tenantId, fecha);
  }
}
