/**
 * Selector de plan + pago con Google Pay -- compartido entre
 * SuscripcionVencidaPage (prueba vencida, pago obligatorio para seguir) y
 * ConfigPage (upgrade voluntario desde "Mejorar plan"). Antes solo existía
 * en la primera, así que el link "Mejorar plan" del panel no llevaba a
 * ningún lado real.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { planesApi, type Plan } from '@/api/planes.api';
import { GooglePayButton } from '@/components/common/GooglePayButton';
import { StripeCardPayButton } from '@/components/common/StripeCardPayButton';
import { clsx } from 'clsx';

const STRIPE_PUBLISHABLE_KEY_PRESENTE = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function PlanUpgradePanel({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation();
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: ['planes-publicos'],
    queryFn: planesApi.listar,
  });

  const suscribirMut = useMutation({
    mutationFn: (pago: { googlePayToken?: string; paymentIntentId?: string }) =>
      planesApi.suscribir({ plan_id: planSeleccionado!, facturacion_anual: anual, ...pago }),
    onSuccess: () => onSuccess?.(),
  });

  const planActual = planes.find((p) => p.id === planSeleccionado);
  // precio_anual_usd es la tarifa MENSUAL con descuento (no el total del
  // año) -- el cobro real anual es ese valor × 12, igual que en el backend.
  const precio = planActual
    ? (anual ? Number(planActual.precio_anual_usd) * 12 : Number(planActual.precio_mensual_usd))
    : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-2 mb-6 bg-gray-100 p-1 rounded-full">
        <button
          type="button"
          onClick={() => setAnual(false)}
          className={clsx('rounded-full px-4 py-1.5 text-sm font-medium', !anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
        >
          {t('suscripcion.mensual')}
        </button>
        <button
          type="button"
          onClick={() => setAnual(true)}
          className={clsx('rounded-full px-4 py-1.5 text-sm font-medium', anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
        >
          {t('suscripcion.anual')} <span className="ml-1 text-xs text-green-600 font-bold">{t('suscripcion.descuento_anual')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
        {planes.map((plan) => {
          const selected = planSeleccionado === plan.id;
          const p = anual ? Number(plan.precio_anual_usd) : Number(plan.precio_mensual_usd);
          return (
            <button
              type="button"
              key={plan.id}
              onClick={() => { setPlanSeleccionado(plan.id); setError(null); }}
              className={clsx(
                'rounded-2xl border-2 p-5 text-left transition-all',
                selected ? 'border-brand-500 ring-2 ring-brand-300 bg-white' : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <p className="font-extrabold text-gray-900">{plan.nombre}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">${p.toFixed(0)}<span className="text-sm font-medium text-gray-400">/mes</span></p>
            </button>
          );
        })}
      </div>

      {planSeleccionado && (
        <div className="max-w-sm w-full space-y-3">
          <p className="text-center text-xs font-medium text-gray-500">
            {t('suscripcion.total')} <strong className="text-gray-900">${precio.toFixed(2)} USD</strong>{anual ? t('suscripcion.por_ano') : t('suscripcion.por_mes')}
          </p>
          <GooglePayButton
            amountUsd={precio}
            disabled={suscribirMut.isPending}
            onError={setError}
            onPaymentToken={(token) => { setError(null); suscribirMut.mutate({ googlePayToken: token }); }}
          />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          {suscribirMut.isError && (
            <p className="text-center text-sm text-red-600">
              {(suscribirMut.error as { message?: string } | null)?.message ?? t('suscripcion.error_pago')}
            </p>
          )}

          {STRIPE_PUBLISHABLE_KEY_PRESENTE && (
            <>
              <div className="relative flex items-center my-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="mx-3 text-xs text-gray-400">{t('suscripcion.o_con_tarjeta')}</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <StripeCardPayButton
                disabled={suscribirMut.isPending}
                crearClientSecret={async () => {
                  const { clientSecret } = await planesApi.crearPaymentIntentPago(planSeleccionado!, anual);
                  return clientSecret;
                }}
                onPagoConfirmado={(paymentIntentId) => { setError(null); suscribirMut.mutate({ paymentIntentId }); }}
                onError={setError}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
