import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, RotateCcw } from 'lucide-react';
import { api } from '@/api/axios';
import { generarReciboPDF } from '@/utils/recibo.pdf';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Transaccion {
  id: string;
  monto: number;
  tipo: string;
  created_at: string;
  cobrador: string;
  distribucion_pago: {
    mora: number;
    interes: number;
    capital: number;
    excedente: number;
  } | null;
}

interface RenovacionInfo {
  fecha: string;
  saldo_liquidado: number;
}

interface HistorialResponse {
  transacciones: Transaccion[];
  renovacion: RenovacionInfo | null;
}

export function HistorialPagosPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useTenantSettings();

  const { data, isLoading } = useQuery<HistorialResponse>({
    queryKey: ['historial', id],
    queryFn: () =>
      api.get(`/reportes/prestamo/${id}/historial`).then((r) => r.data as HistorialResponse),
    enabled: !!id,
  });

  const historial = data?.transacciones ?? [];
  const renovacion = data?.renovacion ?? null;

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const totalCobrado = historial.reduce((s, t) => s + Number(t.monto), 0);

  const imprimirRecibo = (t: Transaccion) => {
    if (!t.distribucion_pago) return;
    generarReciboPDF({
      transaccionId: t.id,
      clienteNombre: 'Cliente',
      clienteCedula: '',
      montoCobrado: Number(t.monto),
      distribucion: t.distribucion_pago,
      cobrador: t.cobrador,
      tenantNombre: settings?.nombre_comercial ?? 'OC Credit',
      piePagina: settings?.texto_pie_recibo ?? undefined,
      simboloMoneda: settings?.simbolo_moneda ?? 'RD$',
      fecha: t.created_at,
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link to={`/prestamos/${id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> Volver al préstamo
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Pagos</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Printer size={15} /> Imprimir
        </button>
      </div>

      {/* Resumen */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm text-emerald-700">{historial.length} pagos registrados</p>
        <p className="text-lg font-extrabold text-emerald-700">{fmt(totalCobrado)} cobrado en total</p>
      </div>

      {/* Liquidado por renovación: las cuotas quedan "Pagado" sin un cobro de
          caja detrás — esto explica por qué el plan muestra todo pagado
          aunque no haya transacciones individuales en este historial. */}
      {renovacion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <RotateCcw size={18} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Este préstamo se liquidó por renovación el {format(new Date(renovacion.fecha), 'dd/MM/yyyy', { locale: es })}
            </p>
            <p className="text-xs text-blue-600">
              Saldo liquidado: {fmt(renovacion.saldo_liquidado)} — no son cobros individuales de caja, sino un cierre administrativo al re-enganchar el préstamo.
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Fecha', 'Cobrador', 'Capital', 'Interés', 'Mora', 'Total', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando…</td></tr>
            ) : historial.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Sin pagos registrados</td></tr>
            ) : (
              historial.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {format(new Date(t.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.cobrador}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.distribucion_pago ? fmt(t.distribucion_pago.capital) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.distribucion_pago ? fmt(t.distribucion_pago.interes) : '—'}
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    {t.distribucion_pago && t.distribucion_pago.mora > 0
                      ? fmt(t.distribucion_pago.mora)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{fmt(Number(t.monto))}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => imprimirRecibo(t)}
                      title="Descargar recibo"
                      className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                    >
                      <Download size={13} /> Recibo
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {historial.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total cobrado</td>
                <td className="px-4 py-3 font-extrabold text-emerald-600">{fmt(totalCobrado)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
