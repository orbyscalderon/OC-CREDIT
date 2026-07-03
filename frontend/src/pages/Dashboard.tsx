import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, AlertTriangle, Wallet, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reportesApi } from '@/api/reportes.api';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { UsoPlanMeter } from '@/components/common/UsoPlanMeter';

const agingLabels: Record<string, string> = {
  Al_Dia:          'Al día',
  '1_a_30_dias':   '1-30 días',
  '31_a_60_dias':  '31-60 días',
  '61_a_90_dias':  '61-90 días',
  'Mas_de_90_dias':'+90 días',
};

const agingColors: Record<string, string> = {
  Al_Dia:          '#22c55e',
  '1_a_30_dias':   '#3b82f6',
  '31_a_60_dias':  '#f59e0b',
  '61_a_90_dias':  '#f97316',
  'Mas_de_90_dias':'#ef4444',
};

function AgingBar({ rango, saldo_pendiente, maxVal }: { rango: string; saldo_pendiente: number; maxVal: number }) {
  const color = agingColors[rango] ?? '#3b82f6';
  const label = agingLabels[rango] ?? rango;
  const pct   = maxVal > 0 ? Math.min(100, (saldo_pendiente / maxVal) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {/* S2-8: tabular-nums en cifras monetarias */}
      <span className="text-xs font-semibold text-gray-700 w-28 text-right flex-shrink-0 mono-nums">
        RD$ {Number(saldo_pendiente).toLocaleString('es-DO', { minimumFractionDigits: 0 })}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportesApi.dashboard,
    refetchInterval: 60_000,
  });

  const { data: aging } = useQuery({
    queryKey: ['aging'],
    queryFn: reportesApi.aging,
  });

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr  = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });

  const agingMax = aging
    ? Math.max(...aging.map((r: any) => Number(r.saldo_pendiente)), 1)
    : 1;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium capitalize">{dateStr}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{greeting} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen operacional de hoy</p>
        </div>
        <Link
          to="/cuentas-cobrar"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg transition-colors"
        >
          Cuentas por cobrar
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* S2-15: banner de error si el dashboard falla */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">No se pudo cargar el dashboard. Verifica la conexión al servidor.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw size={13} />
            Reintentar
          </button>
        </div>
      )}

      {/* Medidor de plan */}
      <UsoPlanMeter />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Cartera Total"
          value={isLoading ? '…' : fmt(Number(data?.cartera?.cartera_total_bruta ?? 0))}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Recaudo Hoy"
          value={isLoading ? '…' : fmt(Number(data?.recaudo_dia?.recaudo_hoy ?? 0))}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Cajas Abiertas"
          value={isLoading ? '…' : (data?.cajas_hoy?.cajas_abiertas ?? 0)}
          icon={Wallet}
          color="amber"
        />
        <StatCard
          title="Mora Total"
          value={isLoading ? '…' : fmt(Number(data?.mora?.mora_total_pendiente ?? 0))}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Aging + Top morosos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Aging de Cartera</h2>
              <p className="text-xs text-gray-400 mt-0.5">Antigüedad de cuotas pendientes</p>
            </div>
          </div>
          {aging && aging.length > 0 ? (
            <div className="space-y-3.5">
              {aging.map((row: any) => (
                <AgingBar
                  key={row.rango}
                  rango={row.rango}
                  saldo_pendiente={Number(row.saldo_pendiente)}
                  maxVal={agingMax}
                />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-gray-300">Sin datos de aging</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Top Morosos</h2>
              <p className="text-xs text-gray-400 mt-0.5">5 clientes con mayor mora activa</p>
            </div>
            <Link to="/cuentas-cobrar" className="text-xs text-brand-600 hover:underline font-medium">
              Ver todos
            </Link>
          </div>
          <Table
            columns={[
              {
                key: 'nombre',
                header: 'Cliente',
                render: (r: any) => (
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.nombre} {r.apellido}</p>
                    <p className="text-xs text-gray-400">{r.cedula}</p>
                  </div>
                ),
              },
              {
                key: 'mora_total',
                header: 'Mora',
                render: (r: any) => (
                  <span className="font-bold text-red-600 text-sm mono-nums">
                    {fmt(Number(r.mora_pendiente ?? r.mora_total ?? 0))}
                  </span>
                ),
              },
            ]}
            data={data?.top_morosos ?? []}
            keyField="cliente_id"
            loading={isLoading}
            emptyMessage="Sin mora activa"
          />
        </div>
      </div>

      {/* Resumen cobros del día */}
      {!isLoading && Number(data?.recaudo_dia?.recaudo_hoy ?? 0) > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Resumen del Día</h2>
          <div className="grid grid-cols-3 gap-4 text-center mt-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-medium">Recaudado</p>
              <p className="text-base font-bold text-blue-700 mt-0.5 mono-nums">
                {fmt(Number(data?.recaudo_dia?.recaudo_hoy ?? 0))}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-500 font-medium">Cartera activa</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5 mono-nums">
                {fmt(Number(data?.cartera?.cartera_total_bruta ?? 0))}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-500 font-medium">Cajas abiertas</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5 mono-nums">{data?.cajas_hoy?.cajas_abiertas ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
