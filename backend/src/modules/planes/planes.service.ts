import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Empleado } from '../usuarios/entities/empleado.entity';

@Injectable()
export class PlanesService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async listarPlanes() {
    return this.ds.query(`
      SELECT id, nombre, descripcion,
             precio_mensual_usd, precio_anual_usd,
             max_prestamos_activos, max_cobradores, max_rutas,
             permite_portal_cliente, permite_whatsapp_bot,
             permite_pagare_pdf, permite_mapa, permite_reportes_avanz,
             orden_display
      FROM planes_saas
      WHERE activo = TRUE
      ORDER BY orden_display ASC
    `);
  }

  async getUsoTenant(tenantId: string) {
    const rows = await this.ds.query(
      `SELECT * FROM v_uso_tenant WHERE tenant_id = $1`,
      [tenantId],
    );
    if (!rows.length) throw new NotFoundException('Tenant no encontrado');
    return rows[0];
  }

  async verificarLimitePrestamo(tenantId: string): Promise<void> {
    const rows = await this.ds.query(
      `SELECT fn_puede_crear_prestamo($1) AS resultado`,
      [tenantId],
    );
    const r = rows[0].resultado;
    if (!r.puede) {
      throw new BadRequestException({
        code: 'PLAN_LIMIT_REACHED',
        message: r.motivo,
        usados: r.usados,
        limite: r.limite,
        plan_id: r.plan_id,
      });
    }
  }

  async registrarTenant(dto: RegistrarTenantDto) {
    // Verificar email no duplicado
    const existe = await this.usuarioRepo.findOne({
      where: { email: dto.email_admin.toLowerCase() },
    });
    if (existe) throw new ConflictException('Ya existe una cuenta con ese email');

    // Obtener datos del plan
    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException('Plan no encontrado');
    const plan = planes[0];

    return this.ds.transaction(async (em) => {
      // 1. Crear tenant
      const tenant = em.create(Tenant, {
        nombre_empresa: dto.nombre_empresa,
        ruc_cedula: dto.ruc_cedula || `TEMP-${Date.now()}`,
        email_contacto: dto.email_admin.toLowerCase(),
        telefono: dto.telefono,
        activo: true,
        plan_suscripcion: dto.plan_id,
        max_cobradores: plan.max_cobradores,
      } as any);
      await em.save(tenant);

      // Actualizar campos del plan (columnas nuevas de migración 004)
      await em.query(
        `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, facturacion_anual = $3
         WHERE id = $4`,
        [dto.plan_id, plan.max_prestamos_activos, dto.facturacion_anual ?? false, tenant.id],
      );

      // 2. Tenant settings por defecto
      await em.query(
        `INSERT INTO tenant_settings (tenant_id, color_primario, color_secundario, color_acento, moneda, simbolo_moneda)
         VALUES ($1, '#2563EB', '#1D4ED8', '#FF6F00', 'DOP', 'RD$')`,
        [tenant.id],
      );

      // 3. Crear usuario admin
      const hash = await bcrypt.hash(dto.password, 12);
      const usuario = em.create(Usuario, {
        tenant_id: tenant.id,
        email: dto.email_admin.toLowerCase(),
        password_hash: hash,
        rol: 'admin_tenant',
        activo: true,
      } as any);
      await em.save(usuario);

      // 4. Crear empleado vinculado al admin
      await em.query(
        `INSERT INTO empleados (tenant_id, usuario_id, nombre, apellido, activo)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [tenant.id, usuario.id, dto.nombre_admin, dto.apellido_admin],
      );

      return {
        tenant_id: tenant.id,
        plan: plan.nombre,
        max_prestamos_activos: plan.max_prestamos_activos,
        mensaje: `Empresa "${dto.nombre_empresa}" registrada en plan ${plan.nombre}. Ya puedes iniciar sesión.`,
      };
    });
  }
}
