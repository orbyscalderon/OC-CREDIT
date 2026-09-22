import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
// tsconfig no tiene esModuleInterop -- "import Stripe from 'stripe'" compila a
// stripe_1.default (undefined, el paquete exporta el constructor directo por
// require()) y explota en runtime con "no es un constructor" recién cuando
// se llama, no en el chequeo de tipos. Import estilo CJS evita eso.
import Stripe = require('stripe');
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';
import { GooglePayRegistroDto } from './dto/google-pay-registro.dto';
import { RegistroGoogleDto } from './dto/registro-google.dto';
import { SuscribirPlanDto } from './dto/suscribir-plan.dto';
import { VerificarCompraGooglePlayDto } from './dto/verificar-compra-google-play.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { monedaPorPais } from '../../common/constants/monedas-por-pais';
import { zonaHorariaPorPais } from '../../common/constants/zona-horaria-por-pais';
import { fechaHoyEnZona } from '../../common/utils/fecha-negocio.util';
import { verificarGoogleIdToken } from '../../common/utils/google-token.util';
import { ZonaHorariaService } from '../../common/services/zona-horaria.service';
import { EmailService } from '../../common/services/email.service';
import { GooglePlayBillingService } from '../../common/services/google-play-billing.service';
import { plantillaBienvenida, plantillaCobroPrueba, plantillaAvisoAdmin } from '../../common/services/email-templates/templates';
import { msg } from '../../common/i18n/messages';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PlanesService {
  private readonly logger = new Logger(PlanesService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    private readonly zonaHorariaService: ZonaHorariaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly googlePlayBilling: GooglePlayBillingService,
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

    // La prueba gratis exige tarjeta -- se valida y se guarda ANTES de
    // crear nada en la BD, así una tarjeta rechazada no deja un tenant a
    // medias. No se cobra nada acá, solo se verifica y se guarda para el
    // cobro automático de PlanesScheduler cuando venza fecha_prueba_hasta.
    // Condicionado a que Stripe esté configurado: así el registro gratis
    // sigue funcionando igual que antes mientras terminan de cargar
    // STRIPE_SECRET_KEY, en vez de romperse para todo el mundo.
    let stripeCustomerId: string | null = null;
    if (!esPago && this.config.get<string>('STRIPE_SECRET_KEY')) {
      if (!dto.stripePaymentMethodId) {
        throw new BadRequestException(msg('planes_tarjeta_requerida'));
      }
      stripeCustomerId = await this.crearClienteStripeConTarjeta(
        dto.email_admin.toLowerCase(),
        dto.nombre_empresa,
        dto.stripePaymentMethodId,
      );
    }

    const resultado = await this.ds.transaction(async (em) => {
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
             fecha_vencimiento_suscripcion = NULL,
             stripe_customer_id = $6,
             stripe_payment_method_id = $7
           WHERE id = $5`,
          [dto.plan_id, plan.max_prestamos_activos, dto.facturacion_anual ?? false, hoy, tenant.id, stripeCustomerId, dto.stripePaymentMethodId],
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

    // Fuera de la transacción a propósito -- un email que falla no debe
    // revertir el registro, que ya tuvo éxito en la BD.
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://ocaruta.com';
    const { subject, html } = plantillaBienvenida({
      nombreEmpresa: dto.nombre_empresa,
      nombreAdmin: dto.nombre_admin,
      email: dto.email_admin.toLowerCase(),
      loginUrl: `${frontendUrl}/login`,
    });
    await this.emailService.enviar({ to: dto.email_admin.toLowerCase(), subject, html });

    return resultado;
  }

  /**
   * Registro público de nueva empresa autenticando con Google en vez de
   * email+password -- arranca con 7 días de prueba gratis, igual que
   * registrarTenant. La cuenta queda con una contraseña aleatoria que nadie
   * conoce (el admin siempre entra con "Continuar con Google"); si algún día
   * quiere una contraseña propia, puede pedirla con /auth/olvide-password.
   */
  async registrarConGoogle(dto: RegistroGoogleDto) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new UnauthorizedException(msg('auth_google_no_configurado'));

    let email: string, nombre: string, apellido: string;
    try {
      ({ email, nombre, apellido } = await verificarGoogleIdToken(dto.credential, clientId));
    } catch {
      throw new UnauthorizedException(msg('auth_google_token_invalido'));
    }

    await this.registrarTenant({
      nombre_empresa: dto.nombre_empresa,
      email_admin: email,
      password: randomBytes(24).toString('hex'),
      nombre_admin: nombre,
      apellido_admin: apellido,
      telefono: dto.telefono,
      ruc_cedula: dto.ruc_cedula,
      pais: dto.pais,
      plan_id: dto.plan_id,
      stripePaymentMethodId: dto.stripePaymentMethodId,
    }, false);

    // La cuenta ya existe -- reutiliza el login con Google para devolver el
    // mismo LoginResponseDto que el panel/app esperan, sin pedirle al
    // usuario que inicie sesión por separado tras registrarse.
    return this.authService.loginWithGoogle(dto.credential);
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
    const precioUsd = this.precioTotalUsd(plan, dto.facturacion_anual ?? false);

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

    const precioUsd = this.precioTotalUsd(plan, dto.facturacion_anual ?? false);

    // Validado ACÁ y en crearPaymentIntentPago (antes de cobrar) -- si solo
    // estuviera acá, un pago directo con tarjeta ya cobrado por Stripe del
    // lado del cliente podía terminar rechazado recién en este paso,
    // dejando a alguien cobrado sin el plan activado.
    await this.verificarPuedeCambiarPlan(tenantId, precioUsd);

    if (precioUsd > 0) {
      if (dto.paymentIntentId) {
        // Pago directo con tarjeta (Stripe Elements) -- alternativa a
        // Google Pay para cuando el navegador/dispositivo no lo soporta.
        // Se verifica estado Y monto contra Stripe, no se confía en lo que
        // mande el cliente.
        await this.verificarPaymentIntentPago(dto.paymentIntentId, precioUsd);
      } else {
        const gpayEnv = this.config.get<string>('GOOGLE_PAY_ENV', 'TEST');
        if (gpayEnv === 'PRODUCTION') {
          await this.procesarPagoStripe(dto.googlePayToken, plan.nombre, precioUsd);
        } else {
          this.logger.log(
            `[Google Pay TEST] Suscripción tenant=${tenantId} plan=${plan.nombre} $${precioUsd} USD.`,
          );
        }
      }
    }

    const meses = dto.facturacion_anual ? 12 : 1;
    const hoy = fechaHoyEnZona(await this.zonaHorariaService.obtener(tenantId));
    await this.ds.query(
      `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, max_cobradores = $3,
         facturacion_anual = $4, plan_suscripcion = $1,
         fecha_prueba_hasta = NULL,
         fecha_vencimiento_suscripcion = $5::date + ($6 || ' months')::interval,
         cobro_prueba_intentos = 0,
         cobro_prueba_ultimo_intento = NULL
       WHERE id = $7`,
      [dto.plan_id, plan.max_prestamos_activos, plan.max_cobradores, dto.facturacion_anual ?? false, hoy, meses, tenantId],
    );

    return { mensaje: `Suscripción activada: plan ${plan.nombre}.` };
  }

  /**
   * Activa/renueva la suscripción de un tenant a partir de una compra hecha
   * DENTRO de la app Android vía Google Play Billing (requerido por la
   * política de Google para compras en apps distribuidas por Play Store).
   * El purchaseToken es único -- un reenvío del mismo token (retry del
   * cliente tras perder la respuesta) no vuelve a extender la fecha.
   */
  async verificarCompraGooglePlay(tenantId: string, dto: VerificarCompraGooglePlayDto) {
    if (!this.googlePlayBilling.estaConfigurado()) {
      throw new BadRequestException(msg('planes_google_play_no_configurado'));
    }

    const yaProcesada = await this.ds.query(
      `SELECT * FROM google_play_compras WHERE purchase_token = $1`,
      [dto.purchaseToken],
    );
    if (yaProcesada.length) {
      return { mensaje: 'Compra ya procesada anteriormente.', estado: yaProcesada[0].estado };
    }

    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.planId],
    );
    if (!planes.length) throw new NotFoundException(msg('planes_no_encontrado'));
    const plan = planes[0];

    const resultado = await this.googlePlayBilling.verificarSuscripcion(dto.productId, dto.purchaseToken);
    if (!resultado.activa) {
      throw new BadRequestException(msg('planes_compra_google_play_invalida', { estado: resultado.estadoCrudo }));
    }

    await this.ds.query(
      `INSERT INTO google_play_compras (tenant_id, plan_id, product_id, purchase_token, estado, fecha_expiracion)
       VALUES ($1, $2, $3, $4, 'activa', $5)`,
      [tenantId, dto.planId, dto.productId, dto.purchaseToken, resultado.fechaExpiracion],
    );

    await this.ds.query(
      `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, max_cobradores = $3,
         plan_suscripcion = $1, fecha_prueba_hasta = NULL,
         fecha_vencimiento_suscripcion = $4
       WHERE id = $5`,
      [dto.planId, plan.max_prestamos_activos, plan.max_cobradores, resultado.fechaExpiracion, tenantId],
    );

    return { mensaje: `Suscripción activada vía Google Play: plan ${plan.nombre}.` };
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

  /**
   * precio_anual_usd guarda la tarifa MENSUAL con descuento cuando se paga
   * anual (ej. plan de $50/mes -> $42.50/mes pagando anual, "con 15% dto"
   * según el comentario de la migración 004) -- NO es el total del año.
   * El monto real a cobrar/mostrar como total es ese valor × 12 meses.
   */
  private precioTotalUsd(plan: { precio_mensual_usd: string | number; precio_anual_usd: string | number }, facturacionAnual: boolean): number {
    return facturacionAnual
      ? Number(plan.precio_anual_usd) * 12
      : Number(plan.precio_mensual_usd);
  }

  /**
   * Tira una excepción si el tenant no puede cambiarse al plan nuevo ahora
   * mismo -- se llama ANTES de cobrar nada (crearPaymentIntentPago) y de
   * nuevo antes de activar (suscribirTenant) como red de seguridad. Sin
   * prorrateo: cambiar de plan siempre resetea fecha_vencimiento a hoy + 1
   * ciclo del plan nuevo, lo cual está bien si la suscripción ya venció o
   * si el cliente paga MÁS que su plan actual (mejora real) -- pero si paga
   * igual o menos con tiempo pagado por delante, se bloquea hasta que venza
   * el ciclo vigente para no regalarle/quitarle meses ya cobrados.
   */
  private async verificarPuedeCambiarPlan(tenantId: string, precioNuevoUsd: number): Promise<void> {
    const hoy = fechaHoyEnZona(await this.zonaHorariaService.obtener(tenantId));
    const tenantActual = await this.ds.query(
      `SELECT to_char(t.fecha_vencimiento_suscripcion, 'YYYY-MM-DD') AS vencimiento,
              p.precio_mensual_usd, p.precio_anual_usd, t.facturacion_anual
       FROM tenants t
       LEFT JOIN planes_saas p ON p.id = t.plan_id
       WHERE t.id = $1 AND t.fecha_vencimiento_suscripcion > $2::date`,
      [tenantId, hoy],
    );
    if (!tenantActual.length) return;
    const precioActualUsd = tenantActual[0].precio_mensual_usd
      ? this.precioTotalUsd(tenantActual[0], tenantActual[0].facturacion_anual)
      : 0;
    if (precioNuevoUsd <= precioActualUsd) {
      throw new BadRequestException(msg('planes_suscripcion_activa', { fecha: tenantActual[0].vencimiento }));
    }
  }

  private stripeClient(): Stripe {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new BadRequestException(msg('planes_pasarela_no_configurada'));
    return new Stripe(secretKey);
  }

  /**
   * SetupIntent -- el frontend lo confirma con Stripe Elements (Card
   * Element) para validar/guardar una tarjeta SIN cobrar nada, antes de
   * mandar el resto del formulario de registro.
   */
  async crearSetupIntent() {
    const stripe = this.stripeClient();
    const intent = await stripe.setupIntents.create({
      // allow_redirects: 'never' -- el registro usa Card Element (sin
      // redirect), y el cobro automático de fin de prueba corre off_session
      // días después sin que el cliente esté presente para volver de un
      // redirect. Sin esto Stripe exige un return_url y falla.
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });
    return { clientSecret: intent.client_secret };
  }

  /**
   * PaymentIntent para pagar/cambiar de plan con tarjeta directa (sin
   * Google Pay) -- alternativa que siempre funciona, sin depender de que
   * el navegador soporte Google Pay. El frontend lo confirma con Stripe
   * Elements y manda el id resultante a /planes/suscribir.
   */
  async crearPaymentIntentPago(tenantId: string, planId: string, facturacionAnual: boolean) {
    const planes = await this.ds.query(`SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`, [planId]);
    if (!planes.length) throw new NotFoundException(msg('planes_no_encontrado'));
    const montoUsd = this.precioTotalUsd(planes[0], facturacionAnual);
    if (montoUsd <= 0) throw new BadRequestException(msg('planes_no_encontrado'));

    // Se valida ANTES de crear el PaymentIntent -- así un cambio que el
    // backend va a rechazar (degradar/lateral con suscripción activa)
    // nunca llega a cobrarle nada a la tarjeta del cliente.
    await this.verificarPuedeCambiarPlan(tenantId, montoUsd);

    const tenants = await this.ds.query(`SELECT nombre_empresa, email_contacto FROM tenants WHERE id = $1`, [tenantId]);
    const tenant = tenants[0];

    const stripe = this.stripeClient();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(montoUsd * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `Plan ${planes[0].nombre} — OCA Ruta`,
      // receipt_email: Stripe manda el recibo solo automáticamente. Sin
      // esto (y sin billing_details del lado del cliente) el pago queda
      // anónimo en el dashboard de Stripe -- sin nombre, sin recibo, sin
      // dato para verificación antifraude (AVS).
      receipt_email: tenant?.email_contacto,
      metadata: { tenant_id: tenantId, nombre_empresa: tenant?.nombre_empresa ?? '' },
    });
    return { clientSecret: intent.client_secret };
  }

  /**
   * Confirma que un PaymentIntent creado por crearPaymentIntentPago
   * efectivamente se cobró y por el monto correcto -- nunca se confía en
   * el monto que venga del cliente, siempre se recalcula del lado del
   * plan/servidor y se compara contra lo que Stripe realmente cobró.
   */
  private async verificarPaymentIntentPago(paymentIntentId: string, montoEsperadoUsd: number): Promise<void> {
    const stripe = this.stripeClient();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      throw new BadRequestException(msg('planes_pago_rechazado', { status: intent.status }));
    }
    if (intent.amount !== Math.round(montoEsperadoUsd * 100)) {
      throw new BadRequestException(msg('planes_pago_rechazado', { status: 'monto_no_coincide' }));
    }
  }

  /**
   * Crea el Customer de Stripe del tenant y le adjunta el payment_method
   * ya confirmado por el SetupIntent como método por defecto -- así
   * PlanesScheduler puede cobrarlo automáticamente sin pedirle la tarjeta
   * de nuevo cuando venza la prueba gratis.
   */
  private async crearClienteStripeConTarjeta(
    email: string,
    nombreEmpresa: string,
    paymentMethodId: string,
  ): Promise<string> {
    const stripe = this.stripeClient();
    try {
      const customer = await stripe.customers.create({
        email,
        name: nombreEmpresa,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      return customer.id;
    } catch (err: unknown) {
      const detalle = (err as Stripe.errors.StripeError)?.message;
      throw new BadRequestException(msg('planes_tarjeta_invalida', { detalle: detalle ?? 'Intente con otra tarjeta' }));
    }
  }

  /**
   * Llamado por PlanesScheduler una vez al día. Cubre dos casos, tratados
   * igual una vez identificados:
   *   1. Prueba gratis vencida, nunca pagó (fecha_vencimiento_suscripcion
   *      IS NULL) -- primer cobro.
   *   2. Suscripción paga vencida y no se renovó (fecha_vencimiento_suscripcion
   *      en el pasado) -- cobro de renovación. jwt-auth.guard.ts da 3 días
   *      de gracia antes de bloquear el acceso; estos reintentos (hasta 3,
   *      c/u ~20hs) ocurren adentro de esa ventana así que casi siempre el
   *      cobro se resuelve antes de que el bloqueo llegue a notarse.
   * En ambos casos: a quien tiene tarjeta guardada le cobra el plan
   * elegido; a quien no tiene tarjeta (se registró antes de tener Stripe
   * configurado, o canceló el cobro automático) le manda un aviso de que
   * debe elegir un plan para seguir -- antes de esto no se notificaba
   * nada, el tenant recién se enteraba al toparse con el bloqueo. Tope de
   * 3 intentos (cobro_prueba_intentos, se resetea a 0 en cada pago exitoso
   * -- manual o automático) para no insistir indefinidamente.
   */
  async cobrarPruebasVencidas(): Promise<{ cobrados: number; fallidos: number; notificados: number }> {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    const stripe = secretKey ? new Stripe(secretKey) : null;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://ocaruta.com';

    const pendientes = await this.ds.query(`
      SELECT t.id AS tenant_id, t.nombre_empresa, t.email_contacto, t.plan_id,
             t.facturacion_anual, t.stripe_customer_id, t.stripe_payment_method_id,
             t.fecha_vencimiento_suscripcion IS NOT NULL AS era_suscripcion_paga,
             p.nombre AS plan_nombre, p.precio_mensual_usd, p.precio_anual_usd, p.max_prestamos_activos,
             e.nombre AS admin_nombre
      FROM tenants t
      JOIN planes_saas p ON p.id = t.plan_id
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.rol = 'admin_tenant' AND u.activo = TRUE
      LEFT JOIN empleados e ON e.usuario_id = u.id
      WHERE t.activo = TRUE
        AND (
          (t.fecha_vencimiento_suscripcion IS NULL AND t.fecha_prueba_hasta IS NOT NULL AND t.fecha_prueba_hasta < CURRENT_DATE)
          OR
          (t.fecha_vencimiento_suscripcion IS NOT NULL AND t.fecha_vencimiento_suscripcion < CURRENT_DATE)
        )
        AND t.cobro_prueba_intentos < 3
        AND (t.cobro_prueba_ultimo_intento IS NULL OR t.cobro_prueba_ultimo_intento < now() - interval '20 hours')
    `);

    let cobrados = 0, fallidos = 0, notificados = 0;

    for (const t of pendientes) {
      const nombreAdmin = t.admin_nombre ?? 'equipo';
      const linkPanel = `${frontendUrl}/panel`;

      if (!stripe || !t.stripe_customer_id || !t.stripe_payment_method_id) {
        try {
          const { subject, html } = plantillaAvisoAdmin({
            nombreAdmin,
            titulo: t.era_suscripcion_paga ? 'Tu suscripción venció' : 'Tu prueba gratis terminó',
            mensaje: t.era_suscripcion_paga
              ? `Tu suscripción de ${t.nombre_empresa} venció y no pudimos renovarla automáticamente. Tenés unos días de gracia antes de que se bloquee el acceso -- tus datos no se pierden, solo hace falta renovar el plan.`
              : `Elegí un plan para seguir usando ${t.nombre_empresa} en OCA Ruta -- tus datos siguen intactos, solo hace falta activar un plan.`,
            link: `${frontendUrl}/suscripcion-vencida`,
            textoLink: 'Elegir un plan',
          });
          await this.emailService.enviar({ to: t.email_contacto, subject, html });
          notificados++;
        } catch (err: unknown) {
          this.logger.warn(`No se pudo notificar prueba vencida sin tarjeta, tenant ${t.tenant_id}: ${(err as Error).message}`);
        }
        await this.ds.query(
          `UPDATE tenants SET cobro_prueba_intentos = cobro_prueba_intentos + 1, cobro_prueba_ultimo_intento = now()
           WHERE id = $1`,
          [t.tenant_id],
        );
        continue;
      }

      const montoUsd = this.precioTotalUsd(t, t.facturacion_anual);
      const meses = t.facturacion_anual ? 12 : 1;

      try {
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(montoUsd * 100),
          currency: 'usd',
          customer: t.stripe_customer_id,
          payment_method: t.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Plan ${t.plan_nombre} — OCA Ruta (fin de prueba)`,
        });

        if (intent.status !== 'succeeded') {
          throw new Error(`estado ${intent.status}`);
        }

        await this.ds.query(
          `UPDATE tenants SET
             fecha_vencimiento_suscripcion = CURRENT_DATE + ($1 || ' months')::interval,
             cobro_prueba_intentos = 0,
             cobro_prueba_ultimo_intento = NULL
           WHERE id = $2`,
          [meses, t.tenant_id],
        );
        cobrados++;

        const { subject, html } = plantillaCobroPrueba({
          nombreAdmin, nombreEmpresa: t.nombre_empresa, exito: true, esRenovacion: t.era_suscripcion_paga,
          planNombre: t.plan_nombre, montoUsd, link: linkPanel,
        });
        await this.emailService.enviar({ to: t.email_contacto, subject, html });
      } catch (err: unknown) {
        fallidos++;
        const motivo = (err as Stripe.errors.StripeError)?.message ?? (err as Error).message;
        this.logger.warn(`Cobro de prueba vencida falló para tenant ${t.tenant_id}: ${motivo}`);

        await this.ds.query(
          `UPDATE tenants SET cobro_prueba_intentos = cobro_prueba_intentos + 1, cobro_prueba_ultimo_intento = now()
           WHERE id = $1`,
          [t.tenant_id],
        );

        const { subject, html } = plantillaCobroPrueba({
          nombreAdmin, nombreEmpresa: t.nombre_empresa, exito: false, esRenovacion: t.era_suscripcion_paga,
          planNombre: t.plan_nombre, montoUsd, motivoFallo: motivo, link: `${frontendUrl}/suscripcion-vencida`,
        });
        await this.emailService.enviar({ to: t.email_contacto, subject, html });
      }
    }

    return { cobrados, fallidos, notificados };
  }

  /**
   * Cancela el cobro automático de fin de prueba -- desvincula la tarjeta
   * guardada (Stripe + BD). El tenant sigue usando la cuenta hasta que
   * venza la prueba; al vencer, cae al mismo flujo de pago manual que ya
   * existía (/suscripcion-vencida) en vez de cobrarse solo.
   */
  async cancelarCobroAutomatico(tenantId: string): Promise<{ mensaje: string }> {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    const tenants = await this.ds.query(`SELECT stripe_payment_method_id FROM tenants WHERE id = $1`, [tenantId]);
    const paymentMethodId = tenants[0]?.stripe_payment_method_id;

    if (secretKey && paymentMethodId) {
      try {
        await new Stripe(secretKey).paymentMethods.detach(paymentMethodId);
      } catch {
        // Si ya estaba desvinculada o Stripe falla, igual limpiamos la BD --
        // lo importante es que no se vuelva a intentar cobrar.
      }
    }

    await this.ds.query(
      `UPDATE tenants SET stripe_payment_method_id = NULL WHERE id = $1`,
      [tenantId],
    );
    return { mensaje: 'Cobro automático cancelado. Tu cuenta sigue activa hasta que termine la prueba.' };
  }
}
