import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, AlertTriangle, Wallet, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reportesApi } from '@/api/reportes.api';
import { StatCard } from '@/components/common/StatCard';
import { Table } from '@/components/common/Table';
import { UsoPlanMeter } from '@/components/common/UsoPlanMeter';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';

const AGING_LABEL_KEYS: Record<string, string> = {
  Al_Dia:          'dashboard.aging.al_dia',
  '1_a_30_dias':   'dashboard.aging.d1_30',
  '31_a_60_dias':  'dashboard.aging.d31_60',
  '61_a_90_dias':  'dashboard.aging.d61_90',
  'Mas_de_90_dias':'dashboard.aging.mas_90',
};

const agingColors: Record<string, string> = {
  Al_Dia:          '#22c55e',
  '1_a_30_dias':   '#3b82f6',
  '31_a_60_dias':  '#f59e0b',
  '61_a_90_dias':  '#f97316',
  'Mas_de_90_dias':'#ef4444',
};

function AgingBar({ rango, saldo_pendiente, maxVal, simboloMoneda }: { rango: string; saldo_pendiente: number; maxVal: number; simboloMoneda: string }) {
  const { t } = useTranslation();
  const color = agingColors[rango] ?? '#3b82f6';
  const label = AGING_LABEL_KEYS[rango] ? t(AGING_LABEL_KEYS[rango]) : rango;
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
        {simboloMoneda} {Number(saldo_pendiente).toLocaleString('es-DO', { minimumFractionDigits: 0 })}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportesApi.dashboard,
    refetchInterval: 60_000,
  });

  const { data: aging } = useQuery({
    queryKey: ['aging'],
    queryFn: reportesApi.aging,
  });

  const fmt = (n: number) => formatCurrency(n, user);

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 18 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');
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
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <Link
          to="/cuentas-cobrar"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg transition-colors"
        >
          {t('dashboard.cuentas_por_cobrar')}
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* S2-15: banner de error si el dashboard falla */}
      {isError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{t('dashboard.error_loading')}</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw size={13} />
            {t('dashboard.retry')}
          </button>
        </div>
      )}

      {/* Medidor de plan */}
      <UsoPlanMeter />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.kpi.cartera_total')}
          value={isLoading ? '…' : fmt(Number(data?.cartera?.cartera_total_bruta ?? 0))}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title={t('dashboard.kpi.recaudo_hoy')}
          value={isLoading ? '…' : fmt(Number(data?.recaudo_dia?.recaudo_hoy ?? 0))}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title={t('dashboard.kpi.cajas_abiertas')}
          value={isLoading ? '…' : (data?.cajas_hoy?.cajas_abiertas ?? 0)}
          icon={Wallet}
          color="amber"
        />
        <StatCard
          title={t('dashboard.kpi.mora_total')}
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
              <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.aging.title')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.aging.subtitle')}</p>
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
                  simboloMoneda={user?.tenant_simbolo_moneda ?? 'RD$'}
                />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-gray-300">{t('dashboard.aging.empty')}</p>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{t('dashboard.top_morosos.title')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.top_morosos.subtitle')}</p>
            </div>
            <Link to="/cuentas-cobrar" className="text-xs text-brand-600 hover:underline font-medium">
              {t('dashboard.top_morosos.ver_todos')}
            </Link>
          </div>
          <Table
            columns={[
              {
                key: 'nombre',
                header: t('dashboard.top_morosos.cliente'),
                render: (r: any) => (
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.nombre} {r.apellido}</p>
                    <p className="text-xs text-gray-400">{r.cedula}</p>
                  </div>
                ),
              },
              {
                key: 'mora_total',
                header: t('dashboard.top_morosos.mora'),
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
            emptyMessage={t('dashboard.top_morosos.empty')}
          />
        </div>
      </div>

      {/* Resumen cobros del día */}
      {!isLoading && Number(data?.recaudo_dia?.recaudo_hoy ?? 0) > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('dashboard.resumen_dia.title')}</h2>
          <div className="grid grid-cols-3 gap-4 text-center mt-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 font-medium">{t('dashboard.resumen_dia.recaudado')}</p>
              <p className="text-base font-bold text-blue-700 mt-0.5 mono-nums">
                {fmt(Number(data?.recaudo_dia?.recaudo_hoy ?? 0))}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs text-emerald-500 font-medium">{t('dashboard.resumen_dia.cartera_activa')}</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5 mono-nums">
                {fmt(Number(data?.cartera?.cartera_total_bruta ?? 0))}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-500 font-medium">{t('dashboard.resumen_dia.cajas_abiertas')}</p>
              <p className="text-xl font-bold text-purple-700 mt-0.5 mono-nums">{data?.cajas_hoy?.cajas_abiertas ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
