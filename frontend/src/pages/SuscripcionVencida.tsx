import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlanUpgradePanel } from '@/components/common/PlanUpgradePanel';
import { authStore } from '@/stores/auth.store';
import { Rol } from '@/types';

export function SuscripcionVencidaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Renovar la suscripción es una acción de facturación -- el backend solo
  // la permite a admin_tenant. Un cobrador/supervisor con la empresa
  // vencida llega aquí igual (a cualquiera lo bloquea el vencimiento), pero
  // mostrarle el formulario de pago solo terminaría en un 403 confuso.
  const esAdmin = authStore.getUser()?.rol === Rol.ADMIN_TENANT;

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

      <div className="max-w-lg w-full">
        <PlanUpgradePanel onSuccess={() => navigate('/panel', { replace: true })} />
      </div>

      <button
        onClick={() => { authStore.clearSession(); navigate('/login'); }}
        className="mt-10 text-sm text-gray-400 hover:text-gray-600"
      >
        {t('suscripcion.cerrar_sesion')}
      </button>
    </div>
  );
}
