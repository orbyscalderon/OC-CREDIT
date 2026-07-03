import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, Clock, Calendar, TrendingDown, X } from 'lucide-react';
import { api } from '@/api/axios';
import { clsx } from 'clsx';

interface Alerta {
  tipo: 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  icono: string;
}

const ICONOS: Record<string, React.ElementType> = {
  AlertTriangle,
  Clock,
  Calendar,
  TrendingDown,
};

const COLORES: Record<string, string> = {
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

const DOT_COLOR: Record<string, string> = {
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-500',
};

export function NotificacionesBell() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ alertas: Alerta[]; total: number }>({
    queryKey: ['notificaciones'],
    queryFn: () => api.get('/reportes/notificaciones').then((r) => r.data as { alertas: Alerta[]; total: number }),
    refetchInterval: 5 * 60 * 1000,
  });

  const total   = data?.total ?? 0;
  const alertas = data?.alertas ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={`Notificaciones${total > 0 ? ` — ${total} alertas pendientes` : ''}`}
        title="Notificaciones"
      >
        <Bell size={18} className="text-gray-600" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* S2-13: dropdown con animate-fade-in */}
          <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
              {/* S3-18: aria-label en botón X */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar notificaciones"
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {alertas.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm font-medium text-gray-400">Sin alertas pendientes</p>
                  <p className="text-xs text-gray-300 mt-0.5">Todo está en orden</p>
                </div>
              ) : (
                alertas.map((a, i) => {
                  const Icon = ICONOS[a.icono] ?? AlertTriangle;
                  return (
                    <div key={i} className={clsx('flex gap-3 px-4 py-3 border-l-4', COLORES[a.tipo])}>
                      <Icon size={15} className={clsx('mt-0.5 flex-shrink-0', DOT_COLOR[a.tipo])} />
                      <div>
                        <p className="text-xs font-semibold">{a.titulo}</p>
                        <p className="text-xs mt-0.5 opacity-80">{a.mensaje}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                Se actualiza cada 5 minutos
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
