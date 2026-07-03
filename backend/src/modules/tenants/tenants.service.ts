import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IsDateString, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { TenantSettings } from './entities/tenant-settings.entity';

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
  ) {}

  async getSettings(tenantId: string): Promise<TenantSettings> {
    const settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!settings) throw new NotFoundException('Configuración no encontrada');
    return settings;
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<TenantSettings> {
    let settings = await this.settingsRepo.findOne({ where: { tenant_id: tenantId } });
    if (!settings) {
      settings = this.settingsRepo.create({ tenant_id: tenantId });
    }
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
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
    if (result[1] === 0) throw new NotFoundException('Feriado no encontrado o es global (no editable)');
    return { eliminado: true, fecha };
  }
}
