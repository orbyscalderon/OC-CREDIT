import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';
import { GooglePayRegistroDto } from './dto/google-pay-registro.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class PlanesService {
  private readonly logger = new Logger(PlanesService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
    private readonly http: HttpService,
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
    const existe = await this.usuarioRepo.findOne({
      where: { email: dto.email_admin.toLowerCase() },
    });
    if (existe) throw new ConflictException('Ya existe una cuenta con ese email');

    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException('Plan no encontrado');
    const plan = planes[0];

    return this.ds.transaction(async (em) => {
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

      await em.query(
        `UPDATE tenants SET plan_id = $1, max_prestamos_activos = $2, facturacion_anual = $3
         WHERE id = $4`,
        [dto.plan_id, plan.max_prestamos_activos, dto.facturacion_anual ?? false, tenant.id],
      );

      await em.query(
        `INSERT INTO tenant_settings (tenant_id, color_primario, color_secundario, color_acento, moneda, simbolo_moneda)
         VALUES ($1, '#2563EB', '#1D4ED8', '#FF6F00', 'DOP', 'RD$')`,
        [tenant.id],
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
        mensaje: `Empresa "${dto.nombre_empresa}" registrada en plan ${plan.nombre}. Ya puedes iniciar sesión.`,
      };
    });
  }

  /**
   * Procesa un registro de tenant con pago vía Google Pay.
   * En entorno TEST (GOOGLE_PAY_ENV=TEST) omite la llamada real a PlacetoPay y
   * registra el token recibido para auditoría. En PRODUCTION, procesa el cobro
   * antes de crear la cuenta.
   */
  async registrarConGooglePay(dto: GooglePayRegistroDto) {
    const planes = await this.ds.query(
      `SELECT * FROM planes_saas WHERE id = $1 AND activo = TRUE`,
      [dto.plan_id],
    );
    if (!planes.length) throw new NotFoundException('Plan no encontrado');
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
      await this.procesarPagoPlacetoPay(dto.googlePayToken, plan.nombre, precioUsd);
    } else {
      // TEST — registra el token recibido pero no cobra
      this.logger.log(
        `[Google Pay TEST] Token recibido para plan ${plan.nombre} $${precioUsd} USD. ` +
        `Token (primeros 40 chars): ${dto.googlePayToken.slice(0, 40)}…`,
      );
    }

    return this.registrarTenant(dto);
  }

  /**
   * Envía el token de Google Pay a PlacetoPay para procesar el cobro.
   * Requiere las variables PLACETOPAY_LOGIN y PLACETOPAY_SECRET_KEY.
   */
  private async procesarPagoPlacetoPay(
    googlePayToken: string,
    planNombre: string,
    montoUsd: number,
  ): Promise<void> {
    const login = this.config.get<string>('PLACETOPAY_LOGIN');
    const secretKey = this.config.get<string>('PLACETOPAY_SECRET_KEY');
    const baseUrl = this.config.get<string>(
      'PLACETOPAY_API_URL',
      'https://checkout.redirection.test',
    );

    if (!login || !secretKey) {
      throw new BadRequestException('Pasarela de pago no configurada. Contacte al soporte.');
    }

    const seed = new Date().toISOString();
    const nonce = crypto.randomBytes(16).toString('base64');
    const tranKey = crypto
      .createHash('sha256')
      .update(`${nonce}${seed}${secretKey}`)
      .digest('base64');

    const body = {
      auth: { login, tranKey, nonce, seed },
      instrument: {
        token: { token: googlePayToken },
      },
      payment: {
        reference: `OC-${Date.now()}`,
        description: `Plan ${planNombre} — OC Credit`,
        amount: { currency: 'USD', total: montoUsd },
      },
    };

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${baseUrl}/api/collect`, body),
      );
      if (data?.status?.status !== 'APPROVED') {
        throw new BadRequestException(
          `Pago rechazado: ${data?.status?.message ?? 'Error desconocido'}`,
        );
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { status?: { message?: string } } } })
        ?.response?.data?.status?.message;
      throw new BadRequestException(`Error procesando pago: ${msg ?? 'Intente nuevamente'}`);
    }
  }
}
