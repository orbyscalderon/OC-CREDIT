import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { reportesApi } from '@/api/reportes.api';
import { Badge } from '@/components/common/Badge';
import { AlertTriangle, Download } from 'lucide-react';
import { exportarCSV } from '@/utils/export';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';

const AGING_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

const RANGO_LABELS: Record<string, string> = {
  Al_Dia: 'Al día',
  '1_a_30_dias': '1-30 días',
  '31_a_60_dias': '31-60 días',
  '61_a_90_dias': '61-90 días',
  Mas_de_90_dias: '+90 días',
};

/* S2-12: función de variante para estado de cuadre */
function cuadreVariant(estado: string) {
  const map: Record<string, 'green' | 'blue' | 'red' | 'gray'> = {
    Cuadrado:  'green',
    Sobrante:  'blue',
    Faltante:  'red',
    Sin_Cerrar:'gray',
  };
  return map[estado] ?? 'gray';
}

export function ReportesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: aging,           isLoading: loadingAging    } = useQuery({ queryKey: ['aging'],              queryFn: reportesApi.aging });
  const { data: arqueos,         isLoading: loadingArqueos  } = useQuery({ queryKey: ['arqueos-hoy'],        queryFn: () => reportesApi.arqueosDia() });
  const { data: moraSresumen,    isLoading: loadingMora     } = useQuery({ queryKey: ['mora-resumen'],        queryFn: reportesApi.moraSresumen });
  const { data: ingresosMens,    isLoading: loadingIngresos } = useQuery({ queryKey: ['ingresos-mensuales'], queryFn: reportesApi.ingresosMensuales });

  const simbolo = user?.tenant_simbolo_moneda ?? 'RD$';
  const fmt = (n: number) => formatCurrency(n, user);

  // El backend devuelve { rango, prestamos, saldo_pendiente } -- se agrega
  // acá la etiqueta legible y el porcentaje (sobre el total de préstamos),
  // que no vienen del backend y antes se leían de campos que no existían
  // en la respuesta (banda/cantidad_prestamos/monto_capital/porcentaje),
  // dejando el gráfico y el pie siempre vacíos.
  const totalPrestamosAging = (aging ?? []).reduce((s, r) => s + Number(r.prestamos), 0);
  const agingConDatos = (aging ?? []).map((r) => ({
    ...r,
    etiqueta: RANGO_LABELS[r.rango] ?? r.rango,
    porcentaje: totalPrestamosAging > 0 ? Math.round((Number(r.prestamos) / totalPrestamosAging) * 1000) / 10 : 0,
  }));

  return (
    /* S1-6: animate-fade-in */
    <div className="p-6 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reportes.titulo')}</h1>
        <p className="text-sm text-gray-500">{t('reportes.subtitulo')}</p>
      </div>

      {/* ── Aging de cartera ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">{t('reportes.aging_titulo')}</h2>
          {agingConDatos.length > 0 && (
            <button
              onClick={() => exportarCSV(
                agingConDatos.map((r) => ({
                  [t('reportes.csv_banda')]: r.etiqueta,
                  [t('reportes.csv_cantidad_prestamos')]: r.prestamos,
                  [t('reportes.csv_capital', { simbolo })]: r.saldo_pendiente,
                  [t('reportes.csv_porcentaje')]: r.porcentaje + '%',
                })),
                `aging-cartera-${new Date().toISOString().slice(0, 10)}`
              )}
              className="btn-secondary text-xs"
            >
              <Download size={13} />
              {t('reportes.exportar')}
            </button>
          )}
        </div>
        {loadingAging ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className="card p-5 h-64 skeleton" />)}
          </div>
        ) : agingConDatos.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">{t('reportes.sin_cartera_pendiente')}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 mb-3">{t('reportes.capital_por_banda')}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={agingConDatos} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="saldo_pendiente" name={t('reportes.capital')} radius={[4,4,0,0]}>
                    {agingConDatos.map((_, idx) => (
                      <Cell key={idx} fill={AGING_COLORS[idx % AGING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="text-xs font-medium text-gray-500 mb-3">{t('reportes.distribucion_prestamos')}</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={agingConDatos}
                    dataKey="prestamos"
                    nameKey="etiqueta"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ etiqueta, porcentaje }: { etiqueta: string; porcentaje: number }) => `${etiqueta}: ${porcentaje}%`}
                    labelLine={false}
                  >
                    {agingConDatos.map((_, idx) => (
                      <Cell key={idx} fill={AGING_COLORS[idx % AGING_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ── Arqueos del día ──────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('reportes.arqueos_titulo')}</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <tr>
                {[t('reportes.col_cobrador'), t('reportes.col_apertura'), t('reportes.col_cobros'), t('reportes.col_gastos'), t('reportes.col_declarado'), t('reportes.col_diferencia'), t('reportes.col_cuadre')].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingArqueos ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="skeleton h-4 rounded" style={{ width: j === 0 ? '70%' : '55%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !arqueos || arqueos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                    {t('reportes.sin_arqueos')}
                  </td>
                </tr>
              ) : (
                arqueos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-800">{a.cobrador}</td>
                    <td className="px-4 py-3.5 mono-nums text-gray-600">{fmt(a.monto_apertura)}</td>
                    <td className="px-4 py-3.5 mono-nums text-emerald-600 font-medium">{fmt(a.total_cobros)}</td>
                    <td className="px-4 py-3.5 mono-nums text-red-500">{fmt(a.total_gastos)}</td>
                    <td className="px-4 py-3.5 mono-nums text-gray-600">
                      {a.monto_cierre_declarado != null ? fmt(a.monto_cierre_declarado) : '—'}
                    </td>
                    <td className="px-4 py-3.5 mono-nums">
                      {a.diferencia_cierre != null ? (
                        <span className={a.diferencia_cierre < 0 ? 'text-red-500 font-medium' : 'text-emerald-600 font-medium'}>
                          {fmt(Math.abs(a.diferencia_cierre))}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {/* S2-12: usa Badge en lugar de inline badge */}
                      <Badge
                        label={a.estado_cuadre ?? 'Abierta'}
                        variant={cuadreVariant(a.estado_cuadre)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {/* ── Ingresos mensuales ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('reportes.ingresos_mensuales')}</h2>
        {loadingIngresos ? (
          <div className="card p-5 h-52 skeleton" />
        ) : ingresosMens && ingresosMens.length > 0 ? (
          <div className="card p-5">
            <ResponsiveContainer width="100%" height={200}>
              {/* El backend ya devuelve ORDER BY mes ASC (mas viejo -> mas
                  nuevo) -- un .reverse() aca invertia el orden cronologico
                  del grafico, mostrando el mes mas reciente a la izquierda. */}
              <BarChart data={ingresosMens} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [fmt(v), t('reportes.cobrado_tooltip')]} />
                <Bar dataKey="total" name={t('reportes.total_cobrado_legend')} fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-gray-400">{t('reportes.sin_ingresos')}</div>
        )}
      </section>

      {/* ── Mora detallada ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">{t('reportes.cartera_mora')}</h2>
          {moraSresumen && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                <span className="font-bold text-red-600 mono-nums">{moraSresumen.total_prestamos_en_mora}</span> {t('reportes.prestamos_suffix')}
              </span>
              <span>
                <span className="font-bold text-red-600 mono-nums">{fmt(moraSresumen.mora_total_pendiente)}</span> {t('reportes.pendiente_suffix')}
              </span>
              <span>
                {t('reportes.max_dias')} <span className="font-bold text-red-600 mono-nums">{moraSresumen.max_dias_mora}</span> {t('reportes.dias_suffix')}
              </span>
            </div>
          )}
        </div>

        {loadingMora ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : !moraSresumen || moraSresumen.total_prestamos_en_mora === 0 ? (
          <div className="card p-6 text-center text-sm text-emerald-600 bg-emerald-50 border-emerald-200">
            {t('reportes.sin_mora_activa')}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <tr>
                  {[t('reportes.col_cliente'), t('reportes.col_cedula'), t('reportes.col_dias_mora'), t('reportes.col_mora_pendiente'), ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(moraSresumen.detalle ?? []).map((m) => (
                  <tr key={m.prestamo_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-800">{m.cliente_nombre} {m.cliente_apellido}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{m.cedula ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-bold mono-nums ${m.dias_mora > 60 ? 'text-red-600' : m.dias_mora > 30 ? 'text-amber-600' : 'text-yellow-600'}`}>
                        {m.dias_mora}d
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-red-500 mono-nums">{fmt(m.mora_pendiente)}</td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/prestamos/${m.prestamo_id}`}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        {t('reportes.ver_prestamo')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Alertas / Notificaciones ─────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-4">{t('reportes.alertas_titulo')}</h2>
        <AlertasSection />
      </section>
    </div>
  );
}

function AlertasSection() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: reportesApi.notificaciones,
    refetchInterval: 5 * 60 * 1000,
  });
  const alertas = data?.alertas ?? [];
  if (alertas.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-emerald-600 bg-emerald-50 border-emerald-200">
        {t('reportes.sin_alertas')}
      </div>
    );
  }
  const colors: Record<string, string> = {
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${colors[a.tipo] ?? colors.info}`}>
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold">{a.titulo}</p>
            <p className="text-xs mt-0.5 opacity-80">{a.mensaje}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
