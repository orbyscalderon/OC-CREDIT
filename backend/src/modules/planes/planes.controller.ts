import { Controller, Get, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../common/decorators/skip-subscription-check.decorator';
import { RequierePermiso } from '../../common/decorators/permisos.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../../common/guards/permisos.guard';
import { Permiso } from '../../common/constants/permisos.enum';
import { PlanesService } from './planes.service';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';
import { GooglePayRegistroDto } from './dto/google-pay-registro.dto';
import { RegistroGoogleDto } from './dto/registro-google.dto';
import { SuscribirPlanDto } from './dto/suscribir-plan.dto';
import { VerificarCompraGooglePlayDto } from './dto/verificar-compra-google-play.dto';
import { CrearPaymentIntentDto } from './dto/crear-payment-intent.dto';

@ApiTags('Planes & Registro')
@Controller({ path: 'planes', version: '1' })
export class PlanesController {
  constructor(private readonly svc: PlanesService) {}

  /** Lista de planes para la landing page — público */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todos los planes disponibles' })
  listar() {
    return this.svc.listarPlanes();
  }

  /** Registro público de nueva empresa — crea tenant + usuario admin con 7 días de prueba gratis */
  @Public()
  @Post('registro')
  @ApiOperation({ summary: 'Registro público de nueva empresa — arranca con 7 días de prueba gratis' })
  registro(@Body() dto: RegistrarTenantDto) {
    return this.svc.registrarTenant(dto, false);
  }

  /** SetupIntent de Stripe -- el frontend lo confirma con Card Element para validar/guardar la tarjeta antes de registrarse, sin cobrar nada */
  @Public()
  @Post('setup-intent')
  @Throttle({ short: { limit: 5, ttl: 60_000 }, long: { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Crea un SetupIntent de Stripe para validar una tarjeta antes del registro' })
  crearSetupIntent() {
    return this.svc.crearSetupIntent();
  }

  /** Registro público con Google — crea tenant + usuario admin autenticando con un ID token de Google, sin contraseña */
  @Public()
  @Post('registro-google')
  @Throttle({ short: { limit: 3, ttl: 60_000 }, long: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Registro público con Google — arranca con 7 días de prueba gratis' })
  registroConGoogle(@Body() dto: RegistroGoogleDto) {
    return this.svc.registrarConGoogle(dto);
  }

  /** Registro con pago vía Google Pay — procesa cobro antes de crear la cuenta, sin período de prueba */
  @Public()
  @Post('google-pay')
  @Throttle({ short: { limit: 3, ttl: 60_000 }, long: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Registro con pago Google Pay — verifica pago y crea tenant' })
  registrarConGooglePay(@Body() dto: GooglePayRegistroDto) {
    return this.svc.registrarConGooglePay(dto);
  }

  /**
   * Activa/renueva la suscripción del tenant autenticado (típicamente tras
   * vencer la prueba de 7 días). Se salta el chequeo de suscripción vigente
   * para que un tenant bloqueado pueda pagar y desbloquearse.
   */
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @RequierePermiso(Permiso.PLANES_ADMIN)
  @SkipSubscriptionCheck()
  @Post('suscribir')
  @Throttle({ short: { limit: 3, ttl: 60_000 }, long: { limit: 10, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Paga/activa la suscripción del tenant autenticado' })
  suscribir(@CurrentUser() user: JwtPayload, @Body() dto: SuscribirPlanDto) {
    return this.svc.suscribirTenant(user.tenantId, dto);
  }

  /** PaymentIntent para pagar el plan con tarjeta directa (alternativa a Google Pay) */
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @RequierePermiso(Permiso.PLANES_ADMIN)
  @SkipSubscriptionCheck()
  @Post('crear-payment-intent')
  @Throttle({ short: { limit: 5, ttl: 60_000 }, long: { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Crea un PaymentIntent para pagar el plan con tarjeta directa' })
  crearPaymentIntentPago(@Body() dto: CrearPaymentIntentDto) {
    return this.svc.crearPaymentIntentPago(dto.plan_id, dto.facturacion_anual ?? false);
  }

  /** Activa/renueva la suscripción a partir de una compra hecha dentro de la app Android (Google Play Billing) */
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @RequierePermiso(Permiso.PLANES_ADMIN)
  @SkipSubscriptionCheck()
  @Post('verificar-compra-google-play')
  @Throttle({ short: { limit: 5, ttl: 60_000 }, long: { limit: 20, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Verifica una compra de Google Play Billing y activa el plan' })
  verificarCompraGooglePlay(@CurrentUser() user: JwtPayload, @Body() dto: VerificarCompraGooglePlayDto) {
    return this.svc.verificarCompraGooglePlay(user.tenantId, dto);
  }

  /** Cancela el cobro automático de fin de prueba (desvincula la tarjeta guardada) */
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @RequierePermiso(Permiso.PLANES_ADMIN)
  @SkipSubscriptionCheck()
  @Post('cancelar-cobro-automatico')
  @ApiOperation({ summary: 'Cancela el cobro automático de fin de prueba' })
  cancelarCobroAutomatico(@CurrentUser() user: JwtPayload) {
    return this.svc.cancelarCobroAutomatico(user.tenantId);
  }
}
