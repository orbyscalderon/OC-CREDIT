import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';
import { GooglePayRegistroDto } from './dto/google-pay-registro.dto';
import { SuscribirPlanDto } from './dto/suscribir-plan.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { monedaPorPais } from '../../common/constants/monedas-por-pais';
import { zonaHorariaPorPais } from '../../common/constants/zona-horaria-por-pais';
import { fechaHoyEnZona } from '../../common/utils/fecha-negocio.util';
import { ZonaHorariaService } from '../../common/services/zona-horaria.service';
import { msg } from '../../common/i18n/messages';

@Injectable()
export class PlanesService {
  private readonly logger = new Logger(PlanesService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    private readonly zonaHorariaService: ZonaHorariaService,
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
    if (!rows.length) throw new NotFoundException(msg('tenants_no_encontrado'));
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

  /**
   * Crea el tenant + usuario admin.
   * esPago=false (registro self-service, sin tarjeta): arranca con 7 días de
   * prueba gratis del plan elegido (fecha_prueba_hasta), sin fecha de vencimiento.
   * esPago=true (ya cobrado vía Google Pay): arranca con suscripción vigente
   * (fecha_vencimiento_suscripcion), sin período de prueba.
   */
  async registrarTenant(dto: RegistrarTenantDto, esPago = false) {
    const existe = await this.usuarioRepo.findOne({
      where: { email: dto.email_admin.toLowerCase() },
    });
    if (existe) throw new ConflictException(msg('cuentas_email_duplicado'));

    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException(msg('planes_no_encontrado'));
    const plan = planes[0];

    const pais = dto.pais?.toUpperCase() || 'DO';
    const moneda = monedaPorPais(pais);
    const zonaHoraria = zonaHorariaPorPais(pais);
    const hoy = fechaHoyEnZona(zonaHoraria);

    return this.ds.transaction(async (em) => {
      const tenant = em.create(Tenant, {
        nombre_empresa: dto.nombre_empresa,
        ruc_cedula: dto.ruc_cedula || `TEMP-${Date.now()}`,
        email_contacto: dto.email_admin.toLowerCase(),
        telefono: dto.telefono,
        pais,
        activo: true,
        plan_suscripcion: dto.plan_id,
        max_cobradores: plan.max_cobradores,
      } as any);
      await em.save(tenant);

      if (esPago) {
        const meses = dto.facturacion_anual ? 12 : 1;
        await em.query(
          `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, facturacion_anual = $3,
             fecha_prueba_hasta = NULL,
             fecha_vencimiento_suscripcion = $4::date + ($5 || ' months')::interval
           WHERE id = $6`,
          [dto.plan_id, plan.max_prestamos_activos, dto.facturacion_anual ?? false, hoy, meses, tenant.id],
        );
      } else {
        await em.query(
          `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, facturacion_anual = $3,
             fecha_prueba_hasta = $4::date + 7,
             fecha_vencimiento_suscripcion = NULL
           WHERE id = $5`,
          [dto.plan_id, plan.max_prestamos_activos, dto.facturacion_anual ?? false, hoy, tenant.id],
        );
      }

      await em.query(
        `INSERT INTO tenant_settings (tenant_id, color_primario, color_secundario, color_acento, moneda, simbolo_moneda, zona_horaria)
         VALUES ($1, '#2563EB', '#1D4ED8', '#FF6F00', $2, $3, $4)`,
        [tenant.id, moneda.codigo, moneda.simbolo, zonaHoraria],
      );

      const hash = await bcrypt.hash(dto.password, 12);
      const usuario = em.create(Usuario, {
        tenant_id: tenant.id,
        email: dto.email_admin.toLowerCase(),
        password_hash: hash,
        rol: 'admin_tenant',
        activo: true,
      } as any);
      await em.save(usuario);

      await em.query(
        `INSERT INTO empleados (tenant_id, usuario_id, nombre, apellido, activo)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [tenant.id, usuario.id, dto.nombre_admin, dto.apellido_admin],
      );

      return {
        tenant_id: tenant.id,
        plan: plan.nombre,
        max_prestamos_activos: plan.max_prestamos_activos,
        mensaje: esPago
          ? `Empresa "${dto.nombre_empresa}" registrada en plan ${plan.nombre}. Ya puedes iniciar sesión.`
          : `Empresa "${dto.nombre_empresa}" registrada con 7 días de prueba gratis del plan ${plan.nombre}. Ya puedes iniciar sesión.`,
      };
    });
  }

  /**
   * Procesa un registro de tenant con pago vía Google Pay.
   * En entorno TEST (GOOGLE_PAY_ENV=TEST) omite la llamada real a Stripe y
   * registra el token recibido para auditoría. En PRODUCTION, procesa el cobro
   * antes de crear la cuenta.
   */
  async registrarConGooglePay(dto: GooglePayRegistroDto) {
    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException(msg('planes_no_encontrado'));
    const plan = planes[0];

    // Plan gratis — no requiere pago
    const precioUsd = dto.facturacion_anual
      ? Number(plan.precio_anual_usd)
      : Number(plan.precio_mensual_usd);

    if (precioUsd === 0) {
      return this.registrarTenant(dto);
    }

    const gpayEnv = this.config.get<string>('GOOGLE_PAY_ENV', 'TEST');

    if (gpayEnv === 'PRODUCTION') {
      await this.procesarPagoStripe(dto.googlePayToken, plan.nombre, precioUsd);
    } else {
      // TEST — registra el token recibido pero no cobra
      this.logger.log(
        `[Google Pay TEST] Token recibido para plan ${plan.nombre} $${precioUsd} USD. ` +
        `Token (primeros 40 chars): ${dto.googlePayToken.slice(0, 40)}…`,
      );
    }

    return this.registrarTenant(dto, true);
  }

  /**
   * Activa/renueva la suscripción de un tenant YA EXISTENTE (típicamente uno
   * cuya prueba de 7 días venció). A diferencia de registrarConGooglePay, no
   * crea cuenta nueva — solo cobra y extiende fecha_vencimiento_suscripcion.
   */
  async suscribirTenant(tenantId: string, dto: SuscribirPlanDto) {
    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException(msg('planes_no_encontrado'));
    const plan = planes[0];

    const precioUsd = dto.facturacion_anual
      ? Number(plan.precio_anual_usd)
      : Number(plan.precio_mensual_usd);

    if (precioUsd > 0) {
      const gpayEnv = this.config.get<string>('GOOGLE_PAY_ENV', 'TEST');
      if (gpayEnv === 'PRODUCTION') {
        await this.procesarPagoStripe(dto.googlePayToken, plan.nombre, precioUsd);
      } else {
        this.logger.log(
          `[Google Pay TEST] Suscripción tenant=${tenantId} plan=${plan.nombre} $${precioUsd} USD.`,
        );
      }
    }

    const meses = dto.facturacion_anual ? 12 : 1;
    const hoy = fechaHoyEnZona(await this.zonaHorariaService.obtener(tenantId));
    await this.ds.query(
      `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, max_cobradores = $3,
         facturacion_anual = $4, plan_suscripcion = $1,
         fecha_prueba_hasta = NULL,
         fecha_vencimiento_suscripcion = $5::date + ($6 || ' months')::interval
       WHERE id = $7`,
      [dto.plan_id, plan.max_prestamos_activos, plan.max_cobradores, dto.facturacion_anual ?? false, hoy, meses, tenantId],
    );

    return { mensaje: `Suscripción activada: plan ${plan.nombre}.` };
  }

  /**
   * Envía el token de Google Pay a Stripe para procesar el cobro.
   * El botón de Google Pay del frontend usa "gateway": "stripe" en su
   * tokenizationSpecification, así que el token recibido YA es un token de
   * Stripe (tok_...), listo para usarse directamente como `source`.
   * Requiere la variable STRIPE_SECRET_KEY.
   */
  private async procesarPagoStripe(
    googlePayToken: string,
    planNombre: string,
    montoUsd: number,
  ): Promise<void> {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new BadRequestException(msg('planes_pasarela_no_configurada'));
    }

    const stripe = new Stripe(secretKey);
    try {
      const charge = await stripe.charges.create({
        amount: Math.round(montoUsd * 100),
        currency: 'usd',
        source: googlePayToken,
        description: `Plan ${planNombre} — OCA Ruta`,
      });
      if (charge.status !== 'succeeded') {
        throw new BadRequestException(msg('planes_pago_rechazado', { status: charge.status }));
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      const detalle = (err as Stripe.errors.StripeError)?.message;
      throw new BadRequestException(msg('planes_error_procesando_pago', { detalle: detalle ?? 'Intente nuevamente' }));
    }
  }
}
