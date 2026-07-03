import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { authStore } from '@/stores/auth.store';
import { NotificacionesBell } from '@/components/common/NotificacionesBell';

const pageTitles: Record<string, string> = {
  '/panel':          'Dashboard',
  '/clientes':       'Clientes',
  '/prestamos':      'Préstamos',
  '/cajas':          'Cajas / Cobros',
  '/rutas':          'Rutas',
  '/buro':           'Buró de Crédito',
  '/cuentas-cobrar': 'Cuentas por Cobrar',
  '/reportes':       'Reportes',
  '/config':         'Configuración',
  '/config/backup':  'Copia de Seguridad',
};

export function AppLayout() {
  const location = useLocation();

  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const pageTitle = Object.entries(pageTitles).find(
    ([path]) => location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* S2-9: glass-header con backdrop-blur */}
        <header
          className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10 glass-header"
          style={{ borderBottom: '1px solid rgba(241,245,249,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div>
            {pageTitle && (
              <h2 className="text-sm font-semibold text-gray-700">{pageTitle}</h2>
            )}
          </div>
          <div className="flex items-center gap-3">
            <NotificacionesBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
