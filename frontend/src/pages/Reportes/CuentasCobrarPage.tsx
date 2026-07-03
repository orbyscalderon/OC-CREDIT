import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { Badge } from '@/components/common/Badge';
import { ArrowUpRight } from 'lucide-react';

interface CuentaCobrar {
  prestamo_id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  telefono: string;
  ruta: string;
  capital_aprobado: number;
  estado_prestamo: string;
  cuotas_pendientes: number;
  saldo_pendiente: number;
  proxima_fecha_vencimiento: string;
  mora_total: number;
  dias_atraso: number;
}

export function CuentasCobrarPage() {
  const [soloVencidos, setSoloVencidos] = useState(false);

  const { data = [], isLoading } = useQuery<CuentaCobrar[]>({
    queryKey: ['cuentas-cobrar', soloVencidos],
    queryFn: () =>
      api.get(`/reportes/cuentas-cobrar?solo_vencidos=${soloVencidos}`).then((r) => r.data as CuentaCobrar[]),
    refetchInterval: 60_000,
  });

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const totalSaldo = data.reduce((s, r) => s + Number(r.saldo_pendiente), 0);
  const totalMora  = data.reduce((s, r) => s + Number(r.mora_total), 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-gray-500">{data.length} préstamos con saldo pendiente</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloVencidos}
            onChange={(e) => setSoloVencidos(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Solo vencidos
        </label>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Saldo total pendiente</p>
          <p className="text-xl font-extrabold text-blue-700 mt-1.5 mono-nums">{fmt(totalSaldo)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-card">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Mora total acumulada</p>
          <p className="text-xl font-extrabold text-red-700 mt-1.5 mono-nums">{fmt(totalMora)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <tr>
              {['Cliente', 'Cédula', 'Ruta', 'Cuotas', 'Saldo', 'Mora', 'Días atraso', 'Estado', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="skeleton h-4 rounded" style={{ width: j === 0 ? '65%' : '50%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                  Sin cuentas pendientes
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.prestamo_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-gray-800">{r.nombre} {r.apellido}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{r.cedula}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{r.ruta ?? '—'}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-gray-700 mono-nums">{r.cuotas_pendientes}</td>
                  <td className="px-4 py-3.5 font-semibold text-blue-600 mono-nums">{fmt(r.saldo_pendiente)}</td>
                  <td className="px-4 py-3.5 font-semibold text-red-500 mono-nums">
                    {Number(r.mora_total) > 0 ? fmt(r.mora_total) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-center mono-nums">
                    {Number(r.dias_atraso) > 0 ? (
                      <span className={`font-bold text-sm ${Number(r.dias_atraso) > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                        {r.dias_atraso}d
                      </span>
                    ) : (
                      <span className="text-emerald-500 text-xs font-medium">Al día</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge label={r.estado_prestamo} variant={r.estado_prestamo === 'Vencido' ? 'red' : 'green'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/prestamos/${r.prestamo_id}`}
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
                    >
                      Ver <ArrowUpRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
