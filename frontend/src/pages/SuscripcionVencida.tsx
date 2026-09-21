import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { planesApi, type Plan } from '@/api/planes.api';
import { GooglePayButton } from '@/components/common/GooglePayButton';
import { authStore } from '@/stores/auth.store';
import { Rol } from '@/types';
import { clsx } from 'clsx';

export function SuscripcionVencidaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Renovar la suscripción es una acción de facturación -- el backend solo
  // la permite a admin_tenant. Un cobrador/supervisor con la empresa
  // vencida llega aquí igual (a cualquiera lo bloquea el vencimiento), pero
  // mostrarle el formulario de pago solo terminaría en un 403 confuso.
  const esAdmin = authStore.getUser()?.rol === Rol.ADMIN_TENANT;

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: ['planes-publicos'],
    queryFn: planesApi.listar,
    enabled: esAdmin,
  });

  const suscribirMut = useMutation({
    mutationFn: (googlePayToken: string) =>
      planesApi.suscribir({ plan_id: planSeleccionado!, facturacion_anual: anual, googlePayToken }),
    onSuccess: () => navigate('/panel', { replace: true }),
  });

  const planActual = planes.find((p) => p.id === planSeleccionado);
  const precio = planActual ? (anual ? Number(planActual.precio_anual_usd) : Number(planActual.precio_mensual_usd)) : 0;

  if (!esAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('suscripcion.solo_admin_titulo')}</h1>
          <p className="text-gray-500">{t('suscripcion.solo_admin_subtitulo')}</p>
          <button
            onClick={() => { authStore.clearSession(); navigate('/login'); }}
            className="mt-8 text-sm text-gray-400 hover:text-gray-600"
          >
            {t('suscripcion.cerrar_sesion')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full text-center mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{t('suscripcion.titulo')}</h1>
        <p className="text-gray-500">
          {t('suscripcion.subtitulo')}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-8 bg-gray-100 p-1 rounded-full">
        <button
          onClick={() => setAnual(false)}
          className={clsx('rounded-full px-4 py-1.5 text-sm font-medium', !anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
        >
          {t('suscripcion.mensual')}
        </button>
        <button
          onClick={() => setAnual(true)}
          className={clsx('rounded-full px-4 py-1.5 text-sm font-medium', anual ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
        >
          {t('suscripcion.anual')} <span className="ml-1 text-xs text-green-600 font-bold">{t('suscripcion.descuento_anual')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg w-full mb-8">
        {planes.map((plan) => {
          const selected = planSeleccionado === plan.id;
          const p = anual ? Number(plan.precio_anual_usd) : Number(plan.precio_mensual_usd);
          return (
            <button
              key={plan.id}
              onClick={() => { setPlanSeleccionado(plan.id); setError(null); }}
              className={clsx(
                'rounded-2xl border-2 p-6 text-left transition-all',
                selected ? 'border-brand-500 ring-2 ring-brand-300 bg-white' : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <p className="font-extrabold text-gray-900">{plan.nombre}</p>
              <p className="text-3xl font-black text-gray-900 mt-2">${p.toFixed(0)}<span className="text-sm font-medium text-gray-400">/mes</span></p>
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
            onPaymentToken={(token) => { setError(null); suscribirMut.mutate(token); }}
          />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          {suscribirMut.isError && (
            <p className="text-center text-sm text-red-600">
              {(suscribirMut.error as { message?: string } | null)?.message ?? t('suscripcion.error_pago')}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => { authStore.clearSession(); navigate('/login'); }}
        className="mt-10 text-sm text-gray-400 hover:text-gray-600"
      >
        {t('suscripcion.cerrar_sesion')}
      </button>
    </div>
  );
}
