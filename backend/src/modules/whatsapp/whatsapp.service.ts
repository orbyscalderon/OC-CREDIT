import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface WaMessage {
  to: string;        // E.164 format: +18095551234
  templateName: string;
  language?: string;
  components?: object[];
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.token         = config.get('WHATSAPP_TOKEN', '');
    this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID', '');
    this.apiUrl        = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  get isConfigured(): boolean {
    return !!this.token && !!this.phoneNumberId;
  }

  /** Envía un mensaje de plantilla aprobada por Meta */
  async sendTemplate(msg: WaMessage): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(`WhatsApp no configurado — mensaje a ${msg.to} omitido`);
      return false;
    }

    const phone = msg.to.replace(/\D/g, '');
    const normalized = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;

    try {
      await firstValueFrom(
        this.http.post(
          this.apiUrl,
          {
            messaging_product: 'whatsapp',
            to: normalized,
            type: 'template',
            template: {
              name: msg.templateName,
              language: { code: msg.language ?? 'es' },
              components: msg.components ?? [],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`WhatsApp enviado a ${normalized} [${msg.templateName}]`);
      return true;
    } catch (err: any) {
      this.logger.error(`Error WhatsApp a ${normalized}: ${err?.message}`);
      return false;
    }
  }

  /**
   * Recordatorio de cuota próxima a vencer.
   * Usa template "recordatorio_cuota" con variables:
   *   {{1}} = nombre cliente
   *   {{2}} = monto cuota (RD$ X,XXX.XX)
   *   {{3}} = fecha vencimiento (dd/mm/yyyy)
   *   {{4}} = nombre empresa
   */
  async recordatorioCuota(opts: {
    telefono: string;
    nombreCliente: string;
    montoCuota: number;
    fechaVencimiento: string;
    simboloMoneda: string;
    nombreEmpresa: string;
  }): Promise<boolean> {
    return this.sendTemplate({
      to: opts.telefono,
      templateName: 'recordatorio_cuota',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: opts.nombreCliente },
            { type: 'text', text: `${opts.simboloMoneda} ${opts.montoCuota.toFixed(2)}` },
            { type: 'text', text: opts.fechaVencimiento },
            { type: 'text', text: opts.nombreEmpresa },
          ],
        },
      ],
    });
  }

  /**
   * Confirmación de pago recibido.
   * Template "confirmacion_pago":
   *   {{1}} = nombre cliente
   *   {{2}} = monto pagado
   *   {{3}} = fecha
   *   {{4}} = nombre empresa
   */
  async confirmacionPago(opts: {
    telefono: string;
    nombreCliente: string;
    montoPagado: number;
    simboloMoneda: string;
    nombreEmpresa: string;
  }): Promise<boolean> {
    return this.sendTemplate({
      to: opts.telefono,
      templateName: 'confirmacion_pago',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: opts.nombreCliente },
            { type: 'text', text: `${opts.simboloMoneda} ${opts.montoPagado.toFixed(2)}` },
            { type: 'text', text: new Date().toLocaleDateString('es-DO') },
            { type: 'text', text: opts.nombreEmpresa },
          ],
        },
      ],
    });
  }

  /** Alerta de mora — cliente lleva N días sin pagar */
  async alertaMora(opts: {
    telefono: string;
    nombreCliente: string;
    diasMora: number;
    montoMora: number;
    simboloMoneda: string;
    nombreEmpresa: string;
  }): Promise<boolean> {
    return this.sendTemplate({
      to: opts.telefono,
      templateName: 'alerta_mora',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: opts.nombreCliente },
            { type: 'text', text: String(opts.diasMora) },
            { type: 'text', text: `${opts.simboloMoneda} ${opts.montoMora.toFixed(2)}` },
            { type: 'text', text: opts.nombreEmpresa },
          ],
        },
      ],
    });
  }
}
