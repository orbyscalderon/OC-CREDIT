import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, Length, Matches, Max, Min,
} from 'class-validator';
import { TenantSettings } from './entities/tenant-settings.entity';
import { ZONAS_HORARIAS_VALIDAS, FORMATOS_FECHA_VALIDOS } from '../../common/constants/zonas-horarias';
import { ZonaHorariaService } from '../../common/services/zona-horaria.service';
import { msg } from '../../common/i18n/messages';

/* ── DTOs ───────────────────────────────────────────────────────────────── */

export class UpdateSettingsDto {
  @IsOptional() @IsString() @Length(0, 500)
  url_logo?: string;

  @IsOptional() @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_primario debe ser un color hex válido' })
  color_primario?: string;

  @IsOptional() @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color_secundario debe ser un color hex válido' })
  color_secundario?: string;

  @IsOptional() @IsString() @Length(1, 3)
  moneda?: string;

  @IsOptional() @IsString() @Length(1, 5)
  simbolo_moneda?: string;

  @IsOptional() @IsString() @Length(0, 200)
  nombre_comercial?: string;

  @IsOptional() @IsString() @Length(0, 300)
  texto_pie_recibo?: string;

  @IsOptional() @IsBoolean()
  whatsapp_activo?: boolean;

  @IsOptional() @IsIn(ZONAS_HORARIAS_VALIDAS)
  zona_horaria?: string;

  @IsOptional() @IsIn(FORMATOS_FECHA_VALIDOS)
  formato_fecha?: string;

  // Estos 4 existían en la entidad y ya los usa el cálculo de mora / la
  // geocerca antifraude (con sus defaults), pero nunca estuvieron en este
  // DTO -- el admin no tenía forma de verlos ni cambiarlos desde el panel.
  @IsOptional() @IsInt() @Min(0) @Max(30)
  dias_mora_gracia?: number;

  // Se guarda como fracción (0.02 = 2%) para que coincida 1:1 con la
  // columna -- el frontend hace la conversión a/desde porcentaje.
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  tasa_mora_diaria?: number;

  @IsOptional() @IsInt() @Min(10) @Max(5000)
  radio_geocerca_metros?: number;

  @IsOptional() @IsBoolean()
  permite_cobro_domingo?: boolean;

  // null = deshabilitado (@IsOptional() de class-validator ya deja pasar
  // null sin exigir @IsInt/@Min/@Max, así el admin puede apagarlo de nuevo).
  @IsOptional() @IsInt() @Min(1) @Max(365)
  dias_mora_reporte_auto?: number | null;
}

export class CrearFeriadoDto {
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsOptional() @IsString() @Length(0, 200)
  descripcion?: string;
}

/* ── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantSettings)
    private readonly settingsRepo: Repository<TenantSettings>,
    private readonly dataSource: DataSource,
    private readonly zonaHorariaService: ZonaHorariaService,
  ) {}

  async getSettings(tenantId: string): Promise<TenantSettings> {
    const settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!settings) throw new NotFoundException(msg('tenants_configuracion_no_encontrada'));
    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<TenantSettings> {
    let settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!settings) {
      settings = this.settingsRepo.create({ tenant_id: tenantId });
    }
    Object.assign(settings, dto);
    const guardado = await this.settingsRepo.save(settings);
    if (dto.zona_horaria) this.zonaHorariaService.invalidar(tenantId);
    return guardado;
  }

  /* ── Feriados ──────────────────────────────────────────────────────────── */

  async listarFeriados(tenantId: string) {
    return this.dataSource.query(
      `SELECT fecha, descripcion FROM feriados
       WHERE tenant_id = $1 OR tenant_id IS NULL
       ORDER BY fecha ASC`,
      [tenantId],
    );
  }

  async crearFeriado(tenantId: string, dto: CrearFeriadoDto) {
    await this.dataSource.query(
      `INSERT INTO feriados (fecha, tenant_id, descripcion)
       VALUES ($1, $2, $3)
       ON CONFLICT (fecha, tenant_id) DO UPDATE SET descripcion = $3`,
      [dto.fecha, tenantId, dto.descripcion ?? null],
    );
    return { fecha: dto.fecha, descripcion: dto.descripcion, tenant_id: tenantId };
  }

  async eliminarFeriado(tenantId: string, fecha: string) {
    const result = await this.dataSource.query(
      `DELETE FROM feriados WHERE fecha = $1 AND tenant_id = $2`,
      [fecha, tenantId],
    );
    if (result[1] === 0) throw new NotFoundException(msg('tenants_feriado_no_encontrado_o_global'));
    return { eliminado: true, fecha };
  }
}
