import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WhatsappService } from './whatsapp.service';
import { fechaEnZona, horaActualEnZona, diaSemanaEnZona } from '../../common/utils/fecha-negocio.util';

interface TenantElegible {
  id: string;
  nombre_empresa: string;
  zona_horaria: string;
}

@Injectable()
export class WhatsappScheduler {
  private readonly logger = new Logger(WhatsappScheduler.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly wa: WhatsappService,
  ) {}

  private async tenantsConWhatsappActivo(): Promise<TenantElegible[]> {
    return this.ds.query<TenantElegible[]>(`
      SELECT t.id, t.nombre_empresa, COALESCE(ts.zona_horaria, 'America/Santo_Domingo') AS zona_horaria
      FROM tenants t
      JOIN planes_saas p2 ON p2.id = t.plan_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
      WHERE t.activo = TRUE
        AND p2.permite_whatsapp_bot = TRUE
        AND (ts.whatsapp_activo IS NULL OR ts.whatsapp_activo = TRUE)
    `);
  }

  /**
   * Recordatorios de cuota: corre cada hora en punto y notifica, para cada
   * tenant, las cuotas que vencen MAÑANA cuando sean las 8:00 AM en SU zona
   * horaria (lunes a sábado) — equivalente al antiguo "0 8 * * 1-6 hora RD"
   * pero evaluado por tenant en vez de global.
   * CRON: 0 * * * *
   */
  @Cron('0 * * * *', { name: 'wa-recordatorios' })
  async enviarRecordatorios(): Promise<void> {
    if (!this.wa.isConfigured) return;

    const tenants = await this.tenantsConWhatsappActivo();
    let totalEnviados = 0;
    let totalCuotas = 0;

    for (const tenant of tenants) {
      const diaSemana = diaSemanaEnZona(tenant.zona_horaria);
      if (horaActualEnZona(tenant.zona_horaria) !== 8 || diaSemana === 0) continue;

      const manana = fechaEnZona(tenant.zona_horaria, 1);

      const cuotas = await this.ds.query(`
        SELECT
          c.id            AS cuota_id,
          c.monto_total   AS monto_cuota,
          c.fecha_vencimiento,
          cl.nombre       AS cliente_nombre,
          cl.apellido     AS cliente_apellido,
          cl.telefono     AS cliente_telefono,
          ts.simbolo_moneda
        FROM cuotas_amortizacion c
        JOIN prestamos pr      ON pr.id = c.prestamo_id
        JOIN clientes cl       ON cl.id = pr.cliente_id
        LEFT JOIN tenant_settings ts ON ts.tenant_id = c.tenant_id
        WHERE c.tenant_id = $1
          AND c.estado     = 'Pendiente'
          AND c.fecha_vencimiento = $2
          AND cl.telefono IS NOT NULL
      `, [tenant.id, manana]);

      totalCuotas += cuotas.length;

      for (const c of cuotas) {
        const ok = await this.wa.recordatorioCuota({
          telefono: c.cliente_telefono,
          nombreCliente: `${c.cliente_nombre} ${c.cliente_apellido}`,
          montoCuota: parseFloat(c.monto_cuota),
          fechaVencimiento: new Date(c.fecha_vencimiento).toLocaleDateString('es-DO'),
          simboloMoneda: c.simbolo_moneda ?? 'RD$',
          nombreEmpresa: tenant.nombre_empresa,
        });
        if (ok) totalEnviados++;
      }
    }

    if (totalCuotas > 0) {
      this.logger.log(`Recordatorios WhatsApp: ${totalEnviados}/${totalCuotas} enviados`);
    }
  }

  /**
   * Alertas de mora: corre cada hora en punto y avisa, para cada tenant,
   * clientes con mora activa hace 3, 7 o 15 días cuando sean las 9:00 AM en
   * SU zona horaria (lunes a sábado). El conteo de días de mora es tiempo
   * transcurrido absoluto (NOW() - created_at), no depende de zona horaria —
   * solo el DISPARADOR del cron (la hora local del tenant) sí depende de ella.
   * CRON: 0 * * * *
   */
  @Cron('0 * * * *', { name: 'wa-alertas-mora' })
  async enviarAlertasMora(): Promise<void> {
    if (!this.wa.isConfigured) return;

    const tenants = await this.tenantsConWhatsappActivo();
    const idsElegibles = tenants
      .filter((t) => horaActualEnZona(t.zona_horaria) === 9 && diaSemanaEnZona(t.zona_horaria) !== 0)
      .map((t) => t.id);
    if (idsElegibles.length === 0) return;

    const morosos = await this.ds.query(`
      SELECT DISTINCT ON (cl.id)
        cl.nombre, cl.apellido, cl.telefono,
        t.nombre_empresa,
        ts.simbolo_moneda,
        COUNT(cm.id)::int      AS num_cargos,
        SUM(cm.monto_mora - cm.monto_pagado)::numeric AS total_mora,
        MIN(cm.created_at)     AS primera_mora,
        EXTRACT(DAY FROM NOW() - MIN(cm.created_at))::int AS dias_mora
      FROM cargos_mora cm
      JOIN prestamos pr   ON pr.id = cm.prestamo_id
      JOIN clientes cl    ON cl.id = pr.cliente_id
      JOIN tenants t      ON t.id  = cm.tenant_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
      WHERE cm.estado = 'Pendiente'
        AND t.id = ANY($1)
        AND cl.telefono IS NOT NULL
        AND EXTRACT(DAY FROM NOW() - cm.created_at) IN (3, 7, 15)
      GROUP BY cl.id, cl.nombre, cl.apellido, cl.telefono,
               t.nombre_empresa, ts.simbolo_moneda
    `, [idsElegibles]);

    for (const m of morosos) {
      await this.wa.alertaMora({
        telefono: m.telefono,
        nombreCliente: `${m.nombre} ${m.apellido}`,
        diasMora: m.dias_mora,
        montoMora: parseFloat(m.total_mora),
        simboloMoneda: m.simbolo_moneda ?? 'RD$',
        nombreEmpresa: m.nombre_empresa,
      });
    }
  }
}
