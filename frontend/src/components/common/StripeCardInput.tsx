/**
 * Captura de tarjeta con Stripe Elements (Card Element) para el registro
 * de tenant nuevo -- la prueba gratis de 7 días exige tarjeta, que se
 * valida/guarda acá (SetupIntent, sin cobrar nada) para que el backend la
 * cobre automáticamente cuando venza la prueba.
 *
 * Config requerida: VITE_STRIPE_PUBLISHABLE_KEY (Stripe Dashboard, pk_live_...)
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeCardElement, type StripeElements } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';
import { planesApi } from '@/api/planes.api';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

export interface StripeCardInputHandle {
  /** Confirma la tarjeta ingresada y devuelve el payment_method id (pm_...) listo para mandar al backend. */
  confirmarTarjeta: () => Promise<string>;
}

export const StripeCardInput = forwardRef<StripeCardInputHandle>((_props, ref) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const clientSecretRef = useRef<string | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [stripe, { clientSecret }] = await Promise.all([
          getStripe(),
          planesApi.crearSetupIntent(),
        ]);
        if (!activo) return;
        if (!stripe) {
          // loadStripe() devuelve null (no tira excepción) si el script de
          // js.stripe.com no cargó -- bloqueador de anuncios/privacidad,
          // sin conexión, etc. Sin esto quedaba en "Cargando…" para siempre.
          setError(t('landing.error_cargando_pago'));
          return;
        }
        if (!containerRef.current) return;
        stripeRef.current = stripe;
        clientSecretRef.current = clientSecret;
        const elements = stripe.elements();
        elementsRef.current = elements;
        const card = elements.create('card', { style: { base: { fontSize: '15px' } } });
        card.mount(containerRef.current);
        card.on('change', (e) => setError(e.error ? e.error.message : null));
        cardRef.current = card;
        setListo(true);
      } catch {
        if (activo) setError(t('landing.error_cargando_pago'));
      }
    })();
    return () => {
      activo = false;
      cardRef.current?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    confirmarTarjeta: async () => {
      const stripe = stripeRef.current;
      const card = cardRef.current;
      const clientSecret = clientSecretRef.current;
      if (!stripe || !card || !clientSecret) throw new Error(t('landing.error_cargando_pago'));

      const { setupIntent, error: err } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });
      if (err || !setupIntent?.payment_method) {
        throw new Error(err?.message ?? t('landing.error_tarjeta_invalida'));
      }
      return typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method.id;
    },
  }));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{t('landing.tarjeta')}</label>
      <div ref={containerRef} className="input-field flex items-center" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {!listo && !error && <span className="text-sm text-gray-400">{t('landing.cargando_pago')}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <p className="mt-1 text-xs text-gray-400">{t('landing.tarjeta_hint')}</p>
    </div>
  );
});
StripeCardInput.displayName = 'StripeCardInput';
