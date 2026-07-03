import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class SuperAdminService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async dashboardGlobal() {
    const [stats] = await this.ds.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE activo = TRUE)                  AS tenants_activos,
        (SELECT COUNT(*) FROM tenants WHERE activo = FALSE)                 AS tenants_inactivos,
        (SELECT COUNT(*) FROM prestamos WHERE estado = 'Activo')            AS prestamos_activos_total,
        (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE)                 AS usuarios_totales,
        (SELECT COUNT(*) FROM buro_credito WHERE activo = TRUE)             AS reportes_buro,
        (SELECT COALESCE(SUM(ps.precio_mensual_usd),0)
         FROM tenants t
         JOIN planes_saas ps ON ps.id = t.plan_id
         WHERE t.activo = TRUE AND ps.precio_mensual_usd > 0)               AS mrr_usd
    `);
    return stats;
  }

  async listarTenants(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const rows = await this.ds.query(`
      SELECT
        t.id, t.nombre_empresa, t.email_contacto, t.activo,
        t.plan_id, t.created_at,
        ps.nombre       AS plan_nombre,
        ps.precio_mensual_usd,
        v.prestamos_activos_usados,
        v.max_prestamos_activos,
        v.pct_prestamos_usados,
        v.cobradores_usados
      FROM tenants t
      LEFT JOIN planes_saas ps ON ps.id = t.plan_id
      LEFT JOIN v_uso_tenant v  ON v.tenant_id = t.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const [{ total }] = await this.ds.query(`SELECT COUNT(*)::int AS total FROM tenants`);
    return { data: rows, total, page, limit };
  }

  async detalleTenant(id: string) {
    const [tenant] = await this.ds.query(
      `SELECT t.*, ps.nombre AS plan_nombre, v.*
       FROM tenants t
       LEFT JOIN planes_saas ps ON ps.id = t.plan_id
       LEFT JOIN v_uso_tenant v ON v.tenant_id = t.id
       WHERE t.id = $1`,
      [id],
    );
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const usuarios = await this.ds.query(
      `SELECT id, email, rol, activo, ultimo_acceso FROM usuarios WHERE tenant_id = $1`,
      [id],
    );

    return { ...tenant, usuarios };
  }

  async cambiarPlan(tenantId: string, planId: string) {
    const [plan] = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [planId],
    );
    if (!plan) throw new NotFoundException('Plan no encontrado');

    await this.ds.query(
      `UPDATE tenants
       SET plan_id = $1, max_prestamos_activos = $2, max_cobradores = $3
       WHERE id = $4`,
      [planId, plan.max_prestamos_activos, plan.max_cobradores, tenantId],
    );

    return { mensaje: `Plan actualizado a ${plan.nombre}` };
  }

  async toggleActivo(tenantId: string, activo: boolean, motivo?: string) {
    await this.ds.query(
      `UPDATE tenants SET activo = $1 WHERE id = $2`,
      [activo, tenantId],
    );
    const estado = activo ? 'activado' : 'desactivado';
    return { mensaje: `Tenant ${estado}${motivo ? `: ${motivo}` : ''}` };
  }

  async mrrHistorico() {
    // MRR estimado: suma de precio_mensual_usd de tenants activos por mes de registro
    return this.ds.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', t.created_at), 'YYYY-MM') AS mes,
        COUNT(t.id)::int                                        AS tenants_nuevos,
        SUM(ps.precio_mensual_usd)::numeric                    AS mrr_nuevo_usd
      FROM tenants t
      JOIN planes_saas ps ON ps.id = t.plan_id
      WHERE t.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', t.created_at)
      ORDER BY mes DESC
    `);
  }
}
