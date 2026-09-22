import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

export interface EstadoSuscripcionPlayStore {
  activa: boolean;
  fechaExpiracion: Date | null;
  estadoCrudo: string;
}

/**
 * Verifica compras de suscripción de Google Play Billing (compras hechas
 * dentro de la app Android) contra la Android Publisher API. Requiere una
 * cuenta de servicio de Google Cloud con acceso "Ver información financiera"
 * enlazada en Play Console > Configuración > Acceso a la API.
 *
 * Config necesaria (ver README/checklist entregado al cliente):
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = contenido completo del JSON de la cuenta de servicio
 *   GOOGLE_PLAY_PACKAGE_NAME         = com.ocaruta.app
 */
@Injectable()
export class GooglePlayBillingService {
  private readonly logger = new Logger(GooglePlayBillingService.name);

  constructor(private readonly config: ConfigService) {}

  estaConfigurado(): boolean {
    return Boolean(
      this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') &&
      this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME'),
    );
  }

  async verificarSuscripcion(productId: string, purchaseToken: string): Promise<EstadoSuscripcionPlayStore> {
    const credencialesJson = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')!;
    const packageName = this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME')!;
    const credentials = JSON.parse(credencialesJson);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidpublisher = google.androidpublisher({ version: 'v3', auth });

    const resp = await androidpublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const estadoCrudo = resp.data.subscriptionState ?? 'DESCONOCIDO';
    const activa = estadoCrudo === 'SUBSCRIPTION_STATE_ACTIVE' || estadoCrudo === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
    const expiryTimeStr = resp.data.lineItems?.[0]?.expiryTime;

    this.logger.log(`Verificación Play Billing productId=${productId} estado=${estadoCrudo}`);

    return {
      activa,
      fechaExpiracion: expiryTimeStr ? new Date(expiryTimeStr) : null,
      estadoCrudo,
    };
  }
}
