import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, RotateCcw, Camera } from 'lucide-react';
import { api } from '@/api/axios';
import { generarReciboPDF } from '@/utils/recibo.pdf';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Transaccion {
  id: string;
  monto: number;
  tipo: string;
  created_at: string;
  cobrador: string;
  foto_comprobante_url: string | null;
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

interface ClienteInfo {
  nombre: string;
  apellido: string;
  cedula: string | null;
}

interface HistorialResponse {
  transacciones: Transaccion[];
  renovacion: RenovacionInfo | null;
  cliente: ClienteInfo | null;
}

export function HistorialPagosPage() {
  const { t } = useTranslation();
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
  const cliente = data?.cliente ?? null;

  const fmt = (n: number) => formatCurrency(n, settings);

  const totalCobrado = historial.reduce((s, t) => s + Number(t.monto), 0);

  const imprimirRecibo = (t: Transaccion) => {
    if (!t.distribucion_pago) return;
    generarReciboPDF({
      transaccionId: t.id,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente',
      clienteCedula: cliente?.cedula ?? '',
      montoCobrado: Number(t.monto),
      distribucion: t.distribucion_pago,
      cobrador: t.cobrador,
      tenantNombre: settings?.nombre_comercial ?? 'OCA Credit',
      piePagina: settings?.texto_pie_recibo ?? undefined,
      simboloMoneda: settings?.simbolo_moneda ?? 'RD$',
      fecha: t.created_at,
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <Link to={`/prestamos/${id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> {t('prestamos.volver_al_prestamo')}
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('prestamos.historial_titulo')}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Printer size={15} /> {t('prestamos.imprimir')}
        </button>
      </div>

      {/* Resumen */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm text-emerald-700">{t('prestamos.pagos_registrados', { count: historial.length })}</p>
        <p className="text-lg font-extrabold text-emerald-700">{t('prestamos.cobrado_en_total', { monto: fmt(totalCobrado) })}</p>
      </div>

      {/* Liquidado por renovación: las cuotas quedan "Pagado" sin un cobro de
          caja detrás — esto explica por qué el plan muestra todo pagado
          aunque no haya transacciones individuales en este historial. */}
      {renovacion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <RotateCcw size={18} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              {t('prestamos.liquidado_renovacion', { fecha: format(new Date(renovacion.fecha), 'dd/MM/yyyy', { locale: es }) })}
            </p>
            <p className="text-xs text-blue-600">
              {t('prestamos.saldo_liquidado_detalle', { monto: fmt(renovacion.saldo_liquidado) })}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[t('prestamos.col_fecha'), t('prestamos.col_cobrador'), t('prestamos.capital'), t('prestamos.col_interes'), t('prestamos.col_mora'), t('prestamos.col_total'), ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t('prestamos.cargando')}</td></tr>
            ) : historial.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t('prestamos.sin_pagos')}</td></tr>
            ) : (
              historial.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{tx.cobrador}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {tx.distribucion_pago ? fmt(tx.distribucion_pago.capital) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {tx.distribucion_pago ? fmt(tx.distribucion_pago.interes) : '—'}
                  </td>
                  <td className="px-4 py-3 text-red-500">
                    {tx.distribucion_pago && tx.distribucion_pago.mora > 0
                      ? fmt(tx.distribucion_pago.mora)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{fmt(Number(tx.monto))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => imprimirRecibo(tx)}
                        title={t('prestamos.descargar_recibo_tooltip')}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        <Download size={13} /> {t('prestamos.recibo')}
                      </button>
                      {tx.foto_comprobante_url && (
                        <a
                          href={`/api/v1/cobros/${tx.id}/foto`}
                          target="_blank"
                          rel="noreferrer"
                          title={t('prestamos.ver_foto_tooltip')}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 hover:underline"
                        >
                          <Camera size={13} /> {t('prestamos.foto')}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {historial.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">{t('prestamos.total_cobrado')}</td>
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
