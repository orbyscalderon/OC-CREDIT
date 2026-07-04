import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PortalService } from './portal.service';

@ApiTags('Portal del Cliente')
@Public()
@Controller({ path: 'portal', version: '1' })
export class PortalController {
  constructor(private readonly svc: PortalService) {}

  /** El cliente consulta sus préstamos activos con su cédula */
  @Get('consultar/:cedula')
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cliente consulta sus préstamos por cédula' })
  consultar(@Param('cedula') cedula: string, @Query('tenantId') tenantId: string) {
    return this.svc.consultarPorCedula(cedula, tenantId);
  }

  /** El cliente inicia solicitud de préstamo desde el portal */
  @Post('solicitar')
  @ApiOperation({ summary: 'Cliente solicita un préstamo desde el portal' })
  solicitar(@Body() dto: {
    tenantId: string;
    cedula: string;
    nombre: string;
    apellido: string;
    telefono: string;
    monto_solicitado: number;
    proposito?: string;
  }) {
    return this.svc.solicitarPrestamo(dto);
  }

  /** Webhook Azul — recibe confirmación de pago digital */
  @Post('webhook/azul')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook pagos Azul (HMAC-SHA256 via x-azul-token si AZUL_WEBHOOK_SECRET configurado)' })
  webhookAzul(
    @Body() payload: Record<string, unknown>,
    @Headers('x-azul-token') sig?: string,
  ) {
    return this.svc.procesarWebhookAzul(payload, sig);
  }

  /** Webhook PlacetoPay — recibe confirmación de pago */
  @Post('webhook/placetopay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook pagos PlacetoPay (HMAC-SHA256 via x-p2p-signature si PLACETOPAY_WEBHOOK_SECRET configurado)' })
  webhookPlacetoPay(
    @Body() payload: Record<string, unknown>,
    @Headers('x-p2p-signature') sig?: string,
  ) {
    return this.svc.procesarWebhookPlacetoPay(payload, sig);
  }
}
