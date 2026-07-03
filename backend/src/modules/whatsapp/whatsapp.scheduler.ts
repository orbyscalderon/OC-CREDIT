import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class WhatsappScheduler {
  private readonly logger = new Logger(WhatsappScheduler.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly wa: WhatsappService,
  ) {}

  /**
   * Recordatorios de cuota: todos los días a las 8:00 AM hora RD
   * Notifica cuotas que vencen MAÑANA y que el tenant tenga WhatsApp activo
   */
  @Cron('0 8 * * 1-6', { name: 'wa-recordatorios', timeZone: 'America/Santo_Domingo' })
  async enviarRecordatorios(): Promise<void> {
    if (!this.wa.isConfigured) return;

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaStr = manana.toISOString().split('T')[0];

    // Cuotas pendientes que vencen mañana, en tenants con WhatsApp habilitado
    const cuotas = await this.ds.query(`
      SELECT
        c.id            AS cuota_id,
        c.monto_total   AS monto_cuota,
        c.fecha_vencimiento,
        cl.nombre       AS cliente_nombre,
        cl.apellido     AS cliente_apellido,
        cl.telefono     AS cliente_telefono,
        t.nombre_empresa,
        ts.simbolo_moneda,
        p2.permite_whatsapp_bot
      FROM cuotas_amortizacion c
      JOIN prestamos pr      ON pr.id = c.prestamo_id
      JOIN clientes cl       ON cl.id = pr.cliente_id
      JOIN tenants t         ON t.id  = c.tenant_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
      LEFT JOIN planes_saas p2     ON p2.id = t.plan_id
      WHERE c.estado     = 'Pendiente'
        AND c.fecha_vencimiento = $1
        AND cl.telefono IS NOT NULL
        AND p2.permite_whatsapp_bot = TRUE
        AND t.activo = TRUE
    `, [fechaStr]);

    this.logger.log(`Recordatorios WhatsApp: ${cuotas.length} cuotas para mañana`);

    let enviados = 0;
    for (const c of cuotas) {
      const ok = await this.wa.recordatorioCuota({
        telefono: c.cliente_telefono,
        nombreCliente: `${c.cliente_nombre} ${c.cliente_apellido}`,
        montoCuota: parseFloat(c.monto_cuota),
        fechaVencimiento: new Date(c.fecha_vencimiento).toLocaleDateString('es-DO'),
        simboloMoneda: c.simbolo_moneda ?? 'RD$',
        nombreEmpresa: c.nombre_empresa,
      });
      if (ok) enviados++;
    }

    this.logger.log(`Recordatorios enviados: ${enviados}/${cuotas.length}`);
  }

  /**
   * Alertas de mora: lunes a sábado 9:00 AM
   * Clientes con mora activa hace 3, 7 o 15 días
   */
  @Cron('0 9 * * 1-6', { name: 'wa-alertas-mora', timeZone: 'America/Santo_Domingo' })
  async enviarAlertasMora(): Promise<void> {
    if (!this.wa.isConfigured) return;

    const morosos = await this.ds.query(`
      SELECT DISTINCT ON (cl.id)
        cl.nombre, cl.apellido, cl.telefono,
        t.nombre_empresa,
        ts.simbolo_moneda,
        COUNT(cm.id)::int      AS num_cargos,
        SUM(cm.monto_mora - cm.monto_mora_pagado)::numeric AS total_mora,
        MIN(cm.created_at)     AS primera_mora,
        EXTRACT(DAY FROM NOW() - MIN(cm.created_at))::int AS dias_mora
      FROM cargos_mora cm
      JOIN prestamos pr   ON pr.id = cm.prestamo_id
      JOIN clientes cl    ON cl.id = pr.cliente_id
      JOIN tenants t      ON t.id  = cm.tenant_id
      LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
      LEFT JOIN planes_saas p2     ON p2.id = t.plan_id
      WHERE cm.estado = 'Pendiente'
        AND p2.permite_whatsapp_bot = TRUE
        AND cl.telefono IS NOT NULL
        AND t.activo = TRUE
        AND EXTRACT(DAY FROM NOW() - cm.created_at) IN (3, 7, 15)
      GROUP BY cl.id, cl.nombre, cl.apellido, cl.telefono,
               t.nombre_empresa, ts.simbolo_moneda
    `);

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
