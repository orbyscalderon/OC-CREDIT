/**
 * Pago directo con tarjeta (Stripe Elements) -- alternativa a Google Pay
 * para cuando el navegador/dispositivo no lo soporta (sin cuenta de
 * Google, Safari sin soporte, etc.). A diferencia de StripeCardInput
 * (que solo valida/guarda la tarjeta via SetupIntent sin cobrar), este
 * componente cobra de una vez con confirmCardPayment.
 *
 * Config requerida: VITE_STRIPE_PUBLISHABLE_KEY (Stripe Dashboard, pk_live_...)
 */
import { useEffect, useRef, useState } from 'react';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

interface StripeCardPayButtonProps {
  /** Crea el PaymentIntent en el backend y devuelve su clientSecret. */
  crearClientSecret: () => Promise<string>;
  /** Se llama con el id del PaymentIntent ya confirmado (succeeded). */
  onPagoConfirmado: (paymentIntentId: string) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}

export function StripeCardPayButton({ crearClientSecret, onPagoConfirmado, onError, disabled }: StripeCardPayButtonProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [listo, setListo] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const stripe = await getStripe();
      if (!activo || !stripe || !containerRef.current) return;
      stripeRef.current = stripe;
      const elements = stripe.elements();
      const card = elements.create('card', { style: { base: { fontSize: '15px' } } });
      card.mount(containerRef.current);
      card.on('change', (e) => setError(e.error ? e.error.message : null));
      cardRef.current = card;
      setListo(true);
    })();
    return () => {
      activo = false;
      cardRef.current?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePagar = async () => {
    const stripe = stripeRef.current;
    const card = cardRef.current;
    if (!stripe || !card) return;
    setPagando(true);
    setError(null);
    try {
      const clientSecret = await crearClientSecret();
      const { paymentIntent, error: err } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (err || paymentIntent?.status !== 'succeeded') {
        throw new Error(err?.message ?? t('suscripcion.error_pago'));
      }
      onPagoConfirmado(paymentIntent.id);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      onError?.(msg);
    } finally {
      setPagando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="input-field flex items-center" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {!listo && !error && <span className="text-sm text-gray-400">{t('landing.cargando_pago')}</span>}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handlePagar}
        disabled={!listo || pagando || disabled}
        className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
      >
        {pagando ? t('landing.creando_cuenta') : t('suscripcion.pagar_con_tarjeta')}
      </button>
    </div>
  );
}
