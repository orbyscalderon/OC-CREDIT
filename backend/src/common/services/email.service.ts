import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const FROM_DEFAULT = 'OCA Ruta <no-reply@ocaruta.com>';
// no-reply@ no acepta respuestas -- sin esto, alguien que responde el email
// (p. ej. "no me llegó el préstamo aprobado") se pierde en el vacío. El
// catch-all de Cloudflare Email Routing ya redirige *@ocaruta.com a la
// bandeja real, así que soporte@ funciona para recibir sin configurar nada más.
const REPLY_TO_DEFAULT = 'soporte@ocaruta.com';

/**
 * Envío de emails transaccionales vía Resend. Si RESEND_API_KEY no está
 * configurada (dev local sin la key, o Railway antes de setearla), los
 * envíos quedan en no-op con un log -- igual que GOOGLE_CLIENT_ID/Stripe
 * en otros módulos, para no romper el arranque del backend por esto.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no configurada -- los emails se registrarán en el log pero no se enviarán.');
    }
  }

  async enviar(params: { to: string; subject: string; html: string; from?: string; replyTo?: string }): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[email no enviado, falta RESEND_API_KEY] to=${params.to} subject="${params.subject}"`);
      return;
    }
    const { error } = await this.resend.emails.send({
      from: params.from ?? FROM_DEFAULT,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo ?? REPLY_TO_DEFAULT,
    });
    if (error) {
      // No relanzamos -- un email que falla (dominio no verificado, rate
      // limit, etc.) no debe tumbar el flujo que lo disparó (registro de
      // tenant, solicitud de préstamo, etc.), que ya tuvo éxito en la BD.
      this.logger.error(`Resend falló al enviar a ${params.to}: ${JSON.stringify(error)}`);
    }
  }
}
