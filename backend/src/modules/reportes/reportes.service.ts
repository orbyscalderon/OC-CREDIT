import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { fechaHoyRD } from '../../common/utils/fecha-negocio.util';

@Injectable()
export class ReportesService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  // ─── DASHBOARD PRINCIPAL (Admin) ──────────────────────────────────────────

  async dashboardAdmin(tenantId: string) {
    const hoy = fechaHoyRD();

    const [cartera, recaudoDia, cajas, mora, vencidos] = await Promise.all([
      // Cartera activa total
      this.em.query<any[]>(`
        SELECT
          COUNT(*) AS prestamos_activos,
          SUM(p.total_a_pagar) AS cartera_total_bruta,
          SUM(
            COALESCE((SELECT SUM(ca.monto_total - ca.monto_pagado)
             FROM cuotas_amortizacion ca
             WHERE ca.prestamo_id = p.id
               AND ca.estado IN ('Pendiente','Abonado','Vencida')), 0)
          ) AS saldo_total_pendiente,
          COUNT(*) FILTER (WHERE p.estado = 'Vencido') AS prestamos_vencidos
        FROM prestamos p
        WHERE p.tenant_id = $1 AND p.estado IN ('Activo', 'Vencido')
      `, [tenantId]),

      // Recaudo del día
      this.em.query<any[]>(`
        SELECT
          COALESCE(SUM(t.monto), 0) AS recaudo_hoy,
          COUNT(t.id)               AS cobros_hoy,
          COUNT(DISTINCT t.cobrador_id) AS cobradores_activos_hoy
        FROM transacciones t
        WHERE t.tenant_id = $1
          AND t.tipo = 'Cobro'
          AND DATE(t.created_at) = $2
      `, [tenantId, hoy]),

      // Estado de cajas hoy
      this.em.query<any[]>(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'Abierta')  AS cajas_abiertas,
          COUNT(*) FILTER (WHERE estado = 'Cerrada')  AS cajas_cerradas,
          SUM(total_cobros)                           AS total_cobrado,
          SUM(total_gastos)                           AS total_gastos,
          SUM(ABS(diferencia_cierre))
            FILTER (WHERE diferencia_cierre IS NOT NULL) AS diferencias_totales
        FROM cajas
        WHERE tenant_id = $1 AND fecha = $2
      `, [tenantId, hoy]),

      // Mora total
      this.em.query<any[]>(`
        SELECT
          COUNT(*)                     AS cuotas_en_mora,
          COALESCE(SUM(cm.monto_mora - cm.monto_pagado), 0) AS mora_total_pendiente,
          MAX(cm.dias_mora)            AS max_dias_mora
        FROM cargos_mora cm
        WHERE cm.tenant_id = $1 AND cm.estado = 'Pendiente'
      `, [tenantId]),

      // Top 5 préstamos más vencidos
      this.em.query<any[]>(`
        SELECT
          cli.nombre, cli.apellido, cli.cedula, cli.telefono,
          p.id AS prestamo_id,
          MAX(cm.dias_mora) AS dias_mora,
          SUM(cm.monto_mora - cm.monto_pagado) AS mora_pendiente
        FROM cargos_mora cm
        JOIN prestamos p ON p.id = cm.prestamo_id
        JOIN clientes cli ON cli.id = p.cliente_id
        WHERE cm.tenant_id = $1 AND cm.estado = 'Pendiente'
        GROUP BY cli.nombre, cli.apellido, cli.cedula, cli.telefono, p.id
        ORDER BY dias_mora DESC
        LIMIT 5
      `, [tenantId]),
    ]);

    return {
      fecha: hoy,
      cartera: cartera[0],
      recaudo_dia: recaudoDia[0],
      cajas_hoy: cajas[0],
      mora: mora[0],
      top_morosos: vencidos,
    };
  }

  // ─── REPORTE DE AGING (Antigüedad de cartera) ─────────────────────────────

  async aging(tenantId: string) {
    return this.em.query<any[]>(`
      SELECT
        CASE
          WHEN CURRENT_DATE - ca.fecha_vencimiento <= 0  THEN 'Al_Dia'
          WHEN CURRENT_DATE - ca.fecha_vencimiento <= 30 THEN '1_a_30_dias'
          WHEN CURRENT_DATE - ca.fecha_vencimiento <= 60 THEN '31_a_60_dias'
          WHEN CURRENT_DATE - ca.fecha_vencimiento <= 90 THEN '61_a_90_dias'
          ELSE 'Mas_de_90_dias'
        END                                          AS rango,
        COUNT(DISTINCT ca.prestamo_id)               AS prestamos,
        SUM(ca.monto_total - ca.monto_pagado)        AS saldo_pendiente
      FROM cuotas_amortizacion ca
      JOIN prestamos p ON p.id = ca.prestamo_id
      WHERE ca.tenant_id = $1
        AND ca.estado IN ('Pendiente','Abonado','Vencida')
        AND p.estado = 'Activo'
      GROUP BY 1
      ORDER BY MIN(CURRENT_DATE - ca.fecha_vencimiento)
    `, [tenantId]);
  }

  // ─── REPORTE POR COBRADOR ─────────────────────────────────────────────────

  async reporteCobrador(tenantId: string, cobradorId: string, desde: string, hasta: string) {
    return this.em.query<any[]>(`
      SELECT
        DATE(t.created_at)                       AS fecha,
        emp.nombre || ' ' || emp.apellido        AS cobrador,
        COUNT(t.id) FILTER (WHERE t.tipo = 'Cobro')  AS total_cobros,
        SUM(t.monto) FILTER (WHERE t.tipo = 'Cobro') AS monto_cobrado,
        COUNT(t.id) FILTER (WHERE t.tipo = 'Gasto')  AS total_gastos,
        SUM(t.monto) FILTER (WHERE t.tipo = 'Gasto') AS monto_gastado
      FROM transacciones t
      JOIN empleados emp ON emp.id = t.cobrador_id
      WHERE t.tenant_id = $1
        AND t.cobrador_id = $2
        AND DATE(t.created_at) BETWEEN $3 AND $4
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `, [tenantId, cobradorId, desde, hasta]);
  }

  // ─── HISTORIAL DE COBROS DE UN PRÉSTAMO ───────────────────────────────────

  async historialCobros(tenantId: string, prestamoId: string) {
    const transacciones = await this.em.query<any[]>(`
      SELECT
        t.id, t.monto, t.tipo, t.created_at,
        t.distribucion_pago,
        t.latitud_transaccion, t.longitud_transaccion,
        t.sincronizado_offline,
        emp.nombre || ' ' || emp.apellido AS cobrador
      FROM transacciones t
      JOIN empleados emp ON emp.id = t.cobrador_id
      WHERE t.tenant_id = $1
        AND t.prestamo_id = $2
        AND t.tipo = 'Cobro'
      ORDER BY t.timestamp_dispositivo ASC
    `, [tenantId, prestamoId]);

    // Si el préstamo se liquidó por renovación, las cuotas quedan "Pagado"
    // sin que exista ningún registro en `transacciones` (la renovación no es
    // un cobro de caja, es un cierre administrativo). Sin esto, el historial
    // se ve vacío aunque el plan de amortización muestre todo pagado.
    const prestamo = await this.em.query<any[]>(`
      SELECT estado, saldo_liquidado_renovacion, updated_at
      FROM prestamos WHERE id = $1 AND tenant_id = $2
    `, [prestamoId, tenantId]);

    const renovacion = prestamo[0]?.estado === 'PagadoPorRenovacion' && prestamo[0]?.saldo_liquidado_renovacion
      ? {
          fecha: prestamo[0].updated_at,
          saldo_liquidado: parseFloat(prestamo[0].saldo_liquidado_renovacion),
        }
      : null;

    return { transacciones, renovacion };
  }

  // ─── CUENTAS POR COBRAR ───────────────────────────────────────────────────

  async cuentasCobrar(tenantId: string, soloVencidos = false) {
    const estadoFiltro = soloVencidos ? `AND p.estado = 'Vencido'` : `AND p.estado IN ('Activo','Vencido')`;
    // cuotas_amortizacion y cargos_mora son DOS tablas hijas independientes
    // de prestamos (1:N cada una). Unirlas ambas directamente en la misma
    // consulta produce un producto cartesiano (ej. 10 cuotas × 19 moras =
    // 190 filas para un solo préstamo), multiplicando todos los SUM/COUNT.
    // Se pre-agrega cada una en su propia subconsulta (1 fila por préstamo)
    // antes de unirlas, para que el join final sea 1:1.
    return this.em.query<any[]>(`
      SELECT
        p.id                            AS prestamo_id,
        cl.nombre, cl.apellido, cl.cedula, cl.telefono,
        r.nombre                        AS ruta,
        p.capital_aprobado,
        p.estado                        AS estado_prestamo,
        COALESCE(cu.cuotas_pendientes, 0) AS cuotas_pendientes,
        COALESCE(cu.saldo_pendiente, 0)   AS saldo_pendiente,
        cu.proxima_fecha_vencimiento,
        COALESCE(mo.mora_total, 0)        AS mora_total,
        COALESCE(CURRENT_DATE - cu.proxima_fecha_vencimiento, 0) AS dias_atraso
      FROM prestamos p
      JOIN clientes cl ON cl.id = p.cliente_id
      LEFT JOIN rutas r ON r.id = p.ruta_id
      LEFT JOIN (
        SELECT
          prestamo_id,
          COUNT(*)                          AS cuotas_pendientes,
          SUM(monto_total - monto_pagado)   AS saldo_pendiente,
          MIN(fecha_vencimiento)             AS proxima_fecha_vencimiento
        FROM cuotas_amortizacion
        WHERE estado IN ('Pendiente','Abonado','Vencida')
        GROUP BY prestamo_id
      ) cu ON cu.prestamo_id = p.id
      LEFT JOIN (
        SELECT prestamo_id, SUM(monto_mora - monto_pagado) AS mora_total
        FROM cargos_mora
        WHERE estado = 'Pendiente'
        GROUP BY prestamo_id
      ) mo ON mo.prestamo_id = p.id
      WHERE p.tenant_id = $1
        ${estadoFiltro}
        AND COALESCE(cu.saldo_pendiente, 0) > 0
      ORDER BY mora_total DESC NULLS LAST, dias_atraso DESC NULLS LAST
    `, [tenantId]);
  }

  // ─── NOTIFICACIONES IN-APP ────────────────────────────────────────────────

  async notificaciones(tenantId: string) {
    const hoy = fechaHoyRD();
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [vencidas, proximasHoy, proximasManana, moraNueva] = await Promise.all([
      // Cuotas ya vencidas (sin pagar)
      this.em.query<any[]>(`
        SELECT COUNT(*)::int AS total, COALESCE(SUM(monto_total - monto_pagado),0) AS monto
        FROM cuotas_amortizacion
        WHERE tenant_id = $1 AND estado = 'Vencida'
      `, [tenantId]),

      // Cuotas que vencen HOY
      this.em.query<any[]>(`
        SELECT COUNT(*)::int AS total
        FROM cuotas_amortizacion ca
        JOIN prestamos p ON p.id = ca.prestamo_id
        WHERE ca.tenant_id = $1
          AND ca.fecha_vencimiento = $2
          AND ca.estado IN ('Pendiente','Abonado')
          AND p.estado = 'Activo'
      `, [tenantId, hoy]),

      // Cuotas que vencen MAÑANA
      this.em.query<any[]>(`
        SELECT COUNT(*)::int AS total
        FROM cuotas_amortizacion ca
        JOIN prestamos p ON p.id = ca.prestamo_id
        WHERE ca.tenant_id = $1
          AND ca.fecha_vencimiento = $2
          AND ca.estado IN ('Pendiente','Abonado')
          AND p.estado = 'Activo'
      `, [tenantId, manana]),

      // Mora pendiente total
      this.em.query<any[]>(`
        SELECT COUNT(DISTINCT prestamo_id)::int AS prestamos_con_mora,
               COALESCE(SUM(monto_mora - monto_pagado),0) AS mora_total
        FROM cargos_mora
        WHERE tenant_id = $1 AND estado = 'Pendiente'
      `, [tenantId]),
    ]);

    const alertas = [];

    if (vencidas[0].total > 0)
      alertas.push({ tipo: 'error', titulo: 'Cuotas vencidas', mensaje: `${vencidas[0].total} cuotas por RD$ ${Number(vencidas[0].monto).toLocaleString('es-DO', {minimumFractionDigits:2})}`, icono: 'AlertTriangle' });

    if (proximasHoy[0].total > 0)
      alertas.push({ tipo: 'warning', titulo: 'Vencen hoy', mensaje: `${proximasHoy[0].total} cuotas vencen hoy`, icono: 'Clock' });

    if (proximasManana[0].total > 0)
      alertas.push({ tipo: 'info', titulo: 'Vencen mañana', mensaje: `${proximasManana[0].total} cuotas vencen mañana`, icono: 'Calendar' });

    if (moraNueva[0].prestamos_con_mora > 0)
      alertas.push({ tipo: 'error', titulo: 'Mora activa', mensaje: `${moraNueva[0].prestamos_con_mora} préstamos con mora total RD$ ${Number(moraNueva[0].mora_total).toLocaleString('es-DO', {minimumFractionDigits:2})}`, icono: 'TrendingDown' });

    return { alertas, total: alertas.length };
  }

  // ─── INGRESOS MENSUALES ───────────────────────────────────────────────────

  async ingresosMensuales(tenantId: string) {
    return this.em.query<any[]>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', t.created_at), 'YYYY-MM') AS mes,
        COALESCE(SUM(COALESCE((t.distribucion_pago->>'capital_pagado')::numeric, 0)), 0) AS capital,
        COALESCE(SUM(COALESCE((t.distribucion_pago->>'interes_pagado')::numeric, 0)), 0) AS interes,
        COALESCE(SUM(COALESCE((t.distribucion_pago->>'mora_pagada')::numeric, 0)), 0)    AS mora,
        COALESCE(SUM(t.monto), 0)                                                         AS total
      FROM transacciones t
      WHERE t.tenant_id = $1
        AND t.tipo = 'Cobro'
        AND t.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', t.created_at)
      ORDER BY mes ASC
    `, [tenantId]);
  }

  // ─── COPIA DE SEGURIDAD ────────────────────────────────────────────────────

  async generarBackup(tenantId: string) {
    const [clientes, prestamos, cuotas, transacciones, cajas] = await Promise.all([
      this.em.query(`SELECT * FROM clientes WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
      this.em.query(`SELECT * FROM prestamos WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
      this.em.query(`
        SELECT ca.* FROM cuotas_amortizacion ca
        JOIN prestamos p ON p.id = ca.prestamo_id
        WHERE ca.tenant_id = $1 ORDER BY p.created_at, ca.numero_cuota
      `, [tenantId]),
      this.em.query(`SELECT * FROM transacciones WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]),
      this.em.query(`SELECT * FROM cajas WHERE tenant_id = $1 ORDER BY fecha DESC`, [tenantId]),
    ]);

    const generadoEn = new Date().toISOString();
    return {
      generado_en: generadoEn,
      tenant_id: tenantId,
      totales: {
        clientes: clientes.length,
        prestamos: prestamos.length,
        cuotas: cuotas.length,
        transacciones: transacciones.length,
        cajas: cajas.length,
      },
      clientes,
      prestamos,
      cuotas,
      transacciones,
      cajas,
    };
  }

  // ─── ARQUEOS CONSOLIDADOS DEL DÍA ─────────────────────────────────────────

  async arqueosDia(tenantId: string, fecha?: string) {
    const f = fecha ?? fechaHoyRD();
    return this.em.query<any[]>(`
      SELECT
        c.id, c.fecha, c.estado,
        emp.nombre || ' ' || emp.apellido AS cobrador,
        r.nombre AS ruta,
        c.monto_apertura, c.total_cobros, c.total_gastos, c.monto_esperado,
        c.monto_cierre_declarado, c.diferencia_cierre,
        CASE
          WHEN c.diferencia_cierre IS NULL THEN 'Sin_Cerrar'
          WHEN ABS(c.diferencia_cierre) < 0.01 THEN 'Cuadrado'
          WHEN c.diferencia_cierre > 0 THEN 'Sobrante'
          ELSE 'Faltante'
        END AS estado_cuadre
      FROM cajas c
      JOIN empleados emp ON emp.id = c.cobrador_id
      LEFT JOIN rutas r ON r.id = c.ruta_id
      WHERE c.tenant_id = $1 AND c.fecha = $2
      ORDER BY c.hora_apertura
    `, [tenantId, f]);
  }
}
