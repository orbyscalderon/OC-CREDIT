import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { planesApi, type UsoPlan } from '@/api/planes.api';
import { clsx } from 'clsx';
import { TrendingUp } from 'lucide-react';

function Bar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = limit >= 9999 ? 0 : Math.min((used / limit) * 100, 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function UsoPlanMeter() {
  const { data: uso } = useQuery<UsoPlan>({
    queryKey: ['uso-plan'],
    queryFn: planesApi.usoActual,
    staleTime: 60_000,
  });

  if (!uso) return null;

  const cerca = uso.pct_prestamos_usados >= 80;
  const lleno = uso.pct_prestamos_usados >= 100;

  return (
    <div className={clsx(
      'rounded-xl border p-4 shadow-sm',
      lleno ? 'bg-red-50 border-red-200' : cerca ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className={lleno ? 'text-red-500' : cerca ? 'text-amber-500' : 'text-blue-600'} />
          <span className="text-sm font-semibold text-gray-700">
            Plan <span className="capitalize text-blue-600">{uso.plan_nombre}</span>
          </span>
        </div>
        <Link to="/config" className="text-xs text-blue-600 hover:underline font-medium">
          Mejorar plan
        </Link>
      </div>

      <div className="space-y-2.5 text-xs text-gray-600">
        <div>
          <div className="flex justify-between mb-1">
            <span>Préstamos activos</span>
            <span className={clsx('font-bold', lleno ? 'text-red-600' : cerca ? 'text-amber-600' : 'text-gray-800')}>
              {uso.prestamos_activos_usados}/{uso.max_prestamos_activos >= 9999 ? '∞' : uso.max_prestamos_activos}
            </span>
          </div>
          <Bar
            used={uso.prestamos_activos_usados}
            limit={uso.max_prestamos_activos}
            color={lleno ? 'bg-red-500' : cerca ? 'bg-amber-400' : 'bg-blue-500'}
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span>Cobradores</span>
            <span className="font-bold text-gray-800">
              {uso.cobradores_usados}/{uso.max_cobradores >= 9999 ? '∞' : uso.max_cobradores}
            </span>
          </div>
          <Bar used={uso.cobradores_usados} limit={uso.max_cobradores} color="bg-purple-400" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span>Rutas activas</span>
            <span className="font-bold text-gray-800">
              {uso.rutas_usadas}/{uso.max_rutas >= 9999 ? '∞' : uso.max_rutas}
            </span>
          </div>
          <Bar used={uso.rutas_usadas} limit={uso.max_rutas} color="bg-emerald-400" />
        </div>
      </div>

      {lleno && (
        <p className="mt-3 text-xs text-red-600 font-medium">
          ⚠ Límite alcanzado — no puedes crear nuevos préstamos. <Link to="/config" className="underline">Mejora tu plan</Link>.
        </p>
      )}
      {cerca && !lleno && (
        <p className="mt-3 text-xs text-amber-700">
          Estás al {Math.round(uso.pct_prestamos_usados)}% de tu límite.
        </p>
      )}
    </div>
  );
}
