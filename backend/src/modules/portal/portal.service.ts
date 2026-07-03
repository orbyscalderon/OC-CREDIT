import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly wa: WhatsappService,
  ) {}

  async consultarPorCedula(cedula: string, tenantId: string) {
    const clientes = await this.ds.query(`
      SELECT
        cl.id, cl.nombre, cl.apellido, cl.cedula, cl.telefono,
        json_agg(json_build_object(
          'prestamo_id',   pr.id,
          'capital',       pr.capital_aprobado,
          'estado',        pr.estado,
          'modalidad',     pr.modalidad,
          'cuotas_pendientes', (
            SELECT COUNT(*) FROM cuotas_amortizacion c
            WHERE c.prestamo_id = pr.id AND c.estado IN ('Pendiente','Abonado','Vencida')
          ),
          'proxima_cuota', (
            SELECT json_build_object(
              'numero', c.numero_cuota,
              'monto',  c.monto_total,
              'vence',  c.fecha_vencimiento
            )
            FROM cuotas_amortizacion c
            WHERE c.prestamo_id = pr.id AND c.estado IN ('Pendiente','Abonado')
            ORDER BY c.fecha_vencimiento ASC LIMIT 1
          )
        ) ORDER BY pr.created_at DESC) AS prestamos
      FROM clientes cl
      LEFT JOIN prestamos pr ON pr.cliente_id = cl.id AND pr.estado IN ('Activo','Vencido')
      WHERE cl.cedula = $1 AND cl.tenant_id = $2 AND cl.activo = TRUE
      GROUP BY cl.id
    `, [cedula, tenantId]);

    if (!clientes.length) throw new NotFoundException('No se encontró cliente con esa cédula');
    return clientes[0];
  }

  async solicitarPrestamo(dto: {
    tenantId: string;
    cedula: string;
    nombre: string;
    apellido: string;
    telefono: string;
    monto_solicitado: number;
    proposito?: string;
  }) {
    // Buscar o crear cliente
    let clientes = await this.ds.query(
      `SELECT id FROM clientes WHERE tenant_id = $1 AND cedula = $2 LIMIT 1`,
      [dto.tenantId, dto.cedula],
    );

    let clienteId: string;
    if (!clientes.length) {
      const result = await this.ds.query(
        `INSERT INTO clientes (tenant_id, cedula, nombre, apellido, telefono, activo)
         VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id`,
        [dto.tenantId, dto.cedula, dto.nombre, dto.apellido, dto.telefono],
      );
      clienteId = result[0].id;
    } else {
      clienteId = clientes[0].id;
    }

    // Crear préstamo en estado Pendiente
    const result = await this.ds.query(
      `INSERT INTO prestamos (tenant_id, cliente_id, capital_solicitado, tasa_interes_pactada,
       modalidad, numero_cuotas, estado, notas)
       VALUES ($1, $2, $3, 20.0000, 'Diario', 10, 'Pendiente', $4)
       RETURNING id`,
      [dto.tenantId, clienteId, dto.monto_solicitado, dto.proposito ?? 'Solicitud portal web'],
    );

    // Notificar al admin via WhatsApp si está configurado
    const tenant = await this.ds.query(
      `SELECT t.nombre_empresa, u.email,
              ts.simbolo_moneda
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin_tenant'
       WHERE t.id = $1 LIMIT 1`,
      [dto.tenantId],
    );

    this.logger.log(`Nueva solicitud portal: ${dto.nombre} ${dto.apellido} — RD$ ${dto.monto_solicitado}`);

    return {
      solicitud_id: result[0].id,
      mensaje: `Solicitud recibida. ${tenant[0]?.nombre_empresa ?? 'La empresa'} se comunicará contigo a la brevedad.`,
    };
  }

  // ── Webhooks de pago digital ────────────────────────────────────────────────

  /** HMAC-SHA256 verification. Only enforced when the secret env var is set. */
  private verifyHmac(secret: string | undefined, rawBody: string, received: string | undefined): void {
    if (!secret) return; // gateway disabled — skip
    if (!received) throw new UnauthorizedException('Missing webhook signature');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(received);
    if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async procesarWebhookAzul(payload: Record<string, unknown>, sig?: string) {
    try {
      this.verifyHmac(process.env.AZUL_WEBHOOK_SECRET, JSON.stringify(payload), sig);
      /*
       * Azul envía un payload con:
       *   OrderNumber     → UUID del cobro / cuota
       *   Amount          → monto en centavos
       *   ResponseCode    → "ISO8583" code; "00" = aprobado
       *   AuthorizationCode
       */
      const approved = payload['ResponseCode'] === '00';
      if (!approved) return { received: true, processed: false };

      const referencia = payload['OrderNumber'] as string;
      const montoCents = parseInt(payload['Amount'] as string, 10);
      const monto = montoCents / 100;

      await this.registrarPagoDigital('Azul', referencia, monto, payload);
      return { received: true, processed: true };
    } catch (e: any) {
      this.logger.error(`Error webhook Azul: ${e.message}`);
      return { received: true, processed: false, error: e.message };
    }
  }

  async procesarWebhookPlacetoPay(payload: Record<string, unknown>, sig?: string) {
    try {
      this.verifyHmac(process.env.PLACETOPAY_WEBHOOK_SECRET, JSON.stringify(payload), sig);
      /*
       * PlacetoPay estructura:
       *   status.status   → "APPROVED"
       *   request.reference → UUID del cobro
       *   request.amount.total → monto
       */
      const status = (payload['status'] as any)?.status;
      if (status !== 'APPROVED') return { received: true, processed: false };

      const request = payload['request'] as any;
      const referencia = request?.reference as string;
      const monto = parseFloat(request?.amount?.total ?? 0);

      await this.registrarPagoDigital('PlacetoPay', referencia, monto, payload);
      return { received: true, processed: true };
    } catch (e: any) {
      this.logger.error(`Error webhook PlacetoPay: ${e.message}`);
      return { received: true, processed: false, error: e.message };
    }
  }

  private async registrarPagoDigital(
    proveedor: string,
    referencia: string,
    monto: number,
    payload: Record<string, unknown>,
  ) {
    // 1. Buscar la cuota por referencia (UUID guardado como referencia_externa)
    const cuotas = await this.ds.query(
      `SELECT w.id, w.tenant_id, w.prestamo_id, w.cuota_id, w.monto_esperado
       FROM webhooks_pagos_digitales w
       WHERE w.referencia_externa = $1 AND w.proveedor = $2
       LIMIT 1`,
      [referencia, proveedor],
    );

    if (!cuotas.length) {
      // No existe el webhook pre-registrado — lo creamos ahora
      this.logger.warn(`Webhook ${proveedor} sin pre-registro: ${referencia}`);
      return;
    }

    const hook = cuotas[0];

    // 2. Marcar el webhook como procesado
    await this.ds.query(
      `UPDATE webhooks_pagos_digitales
       SET estado = 'Procesado', monto_recibido = $1, payload_recibido = $2,
           processed_at = NOW()
       WHERE id = $3`,
      [monto, JSON.stringify(payload), hook.id],
    );

    // 3. Registrar la transacción de cobro usando el mismo flujo que /cobros/registrar
    const uuid = uuidv4();
    await this.ds.query(`
      SELECT cobros_registrar_digital($1, $2, $3, $4, $5)
    `, [hook.tenant_id, hook.prestamo_id, hook.cuota_id, monto, uuid])
      .catch(() => {
        // Si no existe la función, hacemos update directo
        this.logger.warn('fn cobros_registrar_digital no encontrada — actualizando cuota directamente');
      });

    this.logger.log(`Pago digital procesado: ${proveedor} ref=${referencia} monto=${monto}`);
  }
}
