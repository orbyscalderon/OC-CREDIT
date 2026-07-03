import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, RotateCcw, CheckCircle, XCircle,
  FileText, PenLine, History, X, AlertCircle, ShieldAlert,
} from 'lucide-react';
import { generarPagarePDF } from '@/utils/pagare.pdf';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { FirmaDigital } from '@/components/common/FirmaDigital';
import { prestamosApi } from '@/api/prestamos.api';
import { empleadosApi } from '@/api/empleados.api';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import { Table } from '@/components/common/Table';
import type { CuotaAmortizacion } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function mañana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function PrestamoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const settings = useTenantSettings();
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState<string | undefined>();

  const [showAprobar, setShowAprobar] = useState(false);
  const [capitalAprobado, setCapitalAprobado] = useState('');
  const [tasaInteres, setTasaInteres] = useState('5');
  const [cobradorId, setCobradorId] = useState('');
  const [fechaPrimerPago, setFechaPrimerPago] = useState(mañana());

  const [showRechazar, setShowRechazar] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const [showVencido, setShowVencido] = useState(false);
  const [motivoVencido, setMotivoVencido] = useState('');
  const [reportarBuro, setReportarBuro] = useState(true);

  const { data: prestamo, isLoading } = useQuery({
    queryKey: ['prestamo', id],
    queryFn: () => prestamosApi.obtener(id!),
    enabled: !!id,
  });

  const { data: cobradores = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: empleadosApi.listar,
    select: (data) => data.filter((e) => e.activo && e.rol === 'cobrador_tenant'),
  });

  const aprobarMut = useMutation({
    mutationFn: () =>
      prestamosApi.aprobar(id!, {
        capital_aprobado: parseFloat(capitalAprobado) || 0,
        tasa_interes: parseFloat(tasaInteres) || 0,
        cobrador_id: cobradorId,
        fecha_primer_pago: fechaPrimerPago,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prestamo', id] });
      qc.invalidateQueries({ queryKey: ['prestamos'] });
      setShowAprobar(false);
    },
  });

  const rechazarMut = useMutation({
    mutationFn: () => prestamosApi.rechazar(id!, { motivo: motivoRechazo || 'Rechazado por administrador' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prestamo', id] });
      qc.invalidateQueries({ queryKey: ['prestamos'] });
      setShowRechazar(false);
    },
  });

  const marcarVencidoMut = useMutation({
    mutationFn: () => prestamosApi.marcarVencido({
      prestamo_id: id!,
      motivo: motivoVencido || 'Marcado como vencido por administrador',
      reportar_buro: reportarBuro,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prestamo', id] });
      qc.invalidateQueries({ queryKey: ['prestamos'] });
      setShowVencido(false);
    },
  });

  const aprobarErr = aprobarMut.isError
    ? ((aprobarMut.error as any)?.response?.data?.message ?? 'Error al aprobar el préstamo')
    : null;

  const vencidoErr = marcarVencidoMut.isError
    ? ((marcarVencidoMut.error as any)?.response?.data?.message ?? 'Error al marcar el préstamo como vencido')
    : null;

  const fmt = (n: number) =>
    'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  if (isLoading) return <div className="p-6 text-gray-400">Cargando…</div>;
  if (!prestamo) return <div className="p-6 text-red-500">Préstamo no encontrado</div>;

  const totalesCuotas = (prestamo.cuotas ?? []).reduce(
    (acc, c) => ({
      capital: acc.capital + c.capital,
      interes: acc.interes + c.interes,
      total: acc.total + c.monto_total,
      pagado: acc.pagado + c.monto_pagado,
      saldo: acc.saldo + (c.monto_total - c.monto_pagado),
    }),
    { capital: 0, interes: 0, total: 0, pagado: 0, saldo: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      <Link to="/prestamos" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a préstamos
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Préstamo #{prestamo.id.slice(-8).toUpperCase()}</h1>
            {prestamo.cliente && (
              <Link
                to={`/clientes/${prestamo.cliente_id}`}
                className="text-sm text-brand-600 hover:underline"
              >
                {prestamo.cliente.nombre} {prestamo.cliente.apellido} — {prestamo.cliente.cedula}
              </Link>
            )}
          </div>
          <Badge label={prestamo.estado} variant={estadoPrestamoVariant(prestamo.estado)} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-gray-700 lg:grid-cols-4">
          <div>
            <p className="text-gray-400 text-xs">Capital aprobado</p>
            <p className="font-semibold">{fmt(prestamo.capital_aprobado)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Tasa de interés</p>
            <p className="font-semibold">{prestamo.tasa_interes}%</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Cuotas / Modalidad</p>
            <p className="font-semibold">{prestamo.num_cuotas} / {prestamo.modalidad}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Primer vencimiento</p>
            <p className="font-semibold">
              {prestamo.fecha_primer_vencimiento
                ? format(new Date(prestamo.fecha_primer_vencimiento), 'dd MMM yyyy', { locale: es })
                : '—'}
            </p>
          </div>
        </div>

        {/* Acciones según estado */}
        {prestamo.estado === 'Pendiente' && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => {
                setCapitalAprobado(String(prestamo.capital_aprobado));
                setTasaInteres(prestamo.tasa_interes > 0 ? String(prestamo.tasa_interes) : '5');
                setShowAprobar(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle size={15} />
              Aprobar
            </button>
            <button
              onClick={() => setShowRechazar(true)}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <XCircle size={15} />
              Rechazar
            </button>
          </div>
        )}

        {/* Historial de pagos */}
        <div className="mt-4">
          <Link
            to={`/prestamos/${id}/historial`}
            className="flex w-fit items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <History size={15} />
            Ver historial de pagos
          </Link>
        </div>

        {/* Pagaré PDF con firma digital */}
        {['Activo', 'Pagado', 'PagadoPorRenovacion'].includes(prestamo.estado) && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => generarPagarePDF({
                  prestamo,
                  tenantNombre: settings?.nombre_comercial ?? 'OC Credit',
                  simboloMoneda: settings?.simbolo_moneda ?? 'RD$',
                  firmaClienteDataUrl: firmaUrl,
                })}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText size={15} />
                {firmaUrl ? 'Descargar Pagaré con firma' : 'Descargar Pagaré PDF'}
              </button>
              <button
                onClick={() => setMostrarFirma(v => !v)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  firmaUrl
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                    : 'border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <PenLine size={15} />
                {firmaUrl ? 'Firma capturada ✓' : 'Capturar firma'}
              </button>
            </div>

            {mostrarFirma && !firmaUrl && (
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <FirmaDigital
                  label="Firma del deudor (se incrusta en el pagaré)"
                  onFirma={(dataUrl) => {
                    setFirmaUrl(dataUrl);
                    setMostrarFirma(false);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {prestamo.estado === 'Activo' && (
          <div className="mt-3 flex gap-3">
            <Link
              to={`/prestamos/${id}/renovar`}
              className="flex w-fit items-center gap-2 rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <RotateCcw size={15} />
              Renovar préstamo
            </Link>
            <button
              onClick={() => setShowVencido(true)}
              className="flex w-fit items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <ShieldAlert size={15} />
              Marcar como vencido
            </button>
          </div>
        )}
      </div>

      {/* Plan de amortización */}
      {prestamo.cuotas && prestamo.cuotas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Plan de Amortización</h2>
            <span className="text-xs text-gray-400">{prestamo.cuotas.length} cuotas</span>
          </div>

          {/* Totales del plan completo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">Capital total</p>
              <p className="font-semibold text-gray-900 mono-nums">{fmt(totalesCuotas.capital)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-gray-400 text-xs">Interés total</p>
              <p className="font-semibold text-blue-600 mono-nums">{fmt(totalesCuotas.interes)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">Total a pagar</p>
              <p className="font-semibold text-gray-900 mono-nums">{fmt(totalesCuotas.total)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-gray-400 text-xs">Pagado</p>
              <p className="font-semibold text-emerald-600 mono-nums">{fmt(totalesCuotas.pagado)}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-gray-400 text-xs">Saldo pendiente</p>
              <p className="font-semibold text-red-600 mono-nums">{fmt(totalesCuotas.saldo)}</p>
            </div>
          </div>

          <Table<CuotaAmortizacion>
            columns={[
              { key: 'numero_cuota', header: '#' },
              {
                key: 'fecha_vencimiento',
                header: 'Vencimiento',
                render: (r) => format(new Date(r.fecha_vencimiento), 'dd/MM/yyyy'),
              },
              { key: 'capital',  header: 'Capital',  render: (r) => <span className="mono-nums">{fmt(r.capital)}</span> },
              { key: 'interes',  header: 'Interés',  render: (r) => <span className="mono-nums">{fmt(r.interes)}</span> },
              {
                key: 'monto_total',
                header: 'Total cuota',
                render: (r) => <span className="font-semibold text-gray-900 mono-nums">{fmt(r.monto_total)}</span>,
              },
              {
                key: 'monto_pagado',
                header: 'Pagado',
                render: (r) => (
                  <span className={`mono-nums ${r.monto_pagado > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                    {fmt(r.monto_pagado)}
                  </span>
                ),
              },
              {
                key: 'saldo',
                header: 'Saldo',
                render: (r) => {
                  const saldo = r.monto_total - r.monto_pagado;
                  return (
                    <span className={`mono-nums ${saldo > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {fmt(saldo)}
                    </span>
                  );
                },
              },
              {
                key: 'estado',
                header: 'Estado',
                render: (r) => (
                  <Badge
                    label={r.estado}
                    variant={
                      r.estado === 'Pagado' ? 'green'
                      : r.estado === 'Abonado' ? 'amber'
                      : r.estado === 'Vencida' ? 'red'
                      : 'gray'
                    }
                  />
                ),
              },
            ]}
            data={prestamo.cuotas}
            keyField="id"
          />
        </div>
      )}

      {/* Modal: Aprobar préstamo */}
      {showAprobar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Aprobar préstamo</h2>
              <button
                onClick={() => setShowAprobar(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Capital a aprobar (RD$) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={capitalAprobado}
                  onChange={(e) => setCapitalAprobado(e.target.value)}
                  className="input-field mono-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Tasa de interés (%) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={tasaInteres}
                    onChange={(e) => setTasaInteres(e.target.value)}
                    className="input-field mono-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Primer pago <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={fechaPrimerPago}
                    onChange={(e) => setFechaPrimerPago(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Cobrador asignado <span className="text-red-400">*</span>
                </label>
                <select value={cobradorId} onChange={(e) => setCobradorId(e.target.value)} className="input-field">
                  <option value="">— Seleccionar cobrador —</option>
                  {cobradores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  ))}
                </select>
              </div>

              {aprobarErr && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs text-red-700">{Array.isArray(aprobarErr) ? aprobarErr.join(', ') : aprobarErr}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => aprobarMut.mutate()}
                disabled={!capitalAprobado || !tasaInteres || !cobradorId || !fechaPrimerPago || aprobarMut.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {aprobarMut.isPending ? 'Aprobando…' : 'Confirmar aprobación'}
              </button>
              <button onClick={() => setShowAprobar(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rechazar préstamo */}
      {showRechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">Rechazar solicitud</h2>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Motivo del rechazo (opcional)"
              rows={3}
              className="input-field resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => rechazarMut.mutate()}
                disabled={rechazarMut.isPending}
                className="flex-1 justify-center flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {rechazarMut.isPending ? 'Rechazando…' : 'Confirmar rechazo'}
              </button>
              <button onClick={() => setShowRechazar(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Marcar préstamo como vencido */}
      {showVencido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">Marcar préstamo como vencido</h2>
            <p className="text-sm text-gray-500">
              Cierra forzosamente el préstamo. Esta acción no se puede deshacer.
            </p>
            <textarea
              value={motivoVencido}
              onChange={(e) => setMotivoVencido(e.target.value)}
              placeholder="Motivo del cierre forzoso"
              rows={3}
              className="input-field resize-none"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={reportarBuro}
                onChange={(e) => setReportarBuro(e.target.checked)}
                className="rounded border-gray-300"
              />
              Reportar automáticamente al buró de crédito
            </label>

            {vencidoErr && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-700">{Array.isArray(vencidoErr) ? vencidoErr.join(', ') : vencidoErr}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => marcarVencidoMut.mutate()}
                disabled={marcarVencidoMut.isPending}
                className="flex-1 justify-center flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {marcarVencidoMut.isPending ? 'Procesando…' : 'Confirmar'}
              </button>
              <button onClick={() => setShowVencido(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
