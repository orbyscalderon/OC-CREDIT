import { SetMetadata } from '@nestjs/common';

// Permite que un tenant con la prueba de 7 días vencida (o sin suscripción activa)
// siga llamando esta ruta — imprescindible en el propio endpoint de pago/suscripción,
// si no nadie podría salir del bloqueo.
export const SKIP_SUBSCRIPTION_KEY = 'skipSubscriptionCheck';
export const SkipSubscriptionCheck = () => SetMetadata(SKIP_SUBSCRIPTION_KEY, true);
