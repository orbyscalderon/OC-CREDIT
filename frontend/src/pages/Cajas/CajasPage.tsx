import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, PlusCircle, AlertCircle, X, PiggyBank } from 'lucide-react';
import { cajasApi } from '@/api/cajas.api';
import { rutasApi } from '@/api/rutas.api';
import { Table } from '@/components/common/Table';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';
import type { Caja } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function CajasPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [montoApertura, setMontoApertura] = useState('0');

  const { data: cajas, isLoading } = useQuery({
    queryKey: ['cajas-hoy'],
    queryFn: () => cajasApi.listarDelDia(),
    refetchInterval: 30_000,
  });

  const { data: rutas } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => rutasApi.listar(),
  });

  // Un cobrador puede tener varias cajas abiertas a la vez, una por ruta.
  const misCajasHoy = cajas?.filter((c) => c.cobrador_id === user?.empleadoId) ?? [];
  const rutasConCajaHoy = new Set(misCajasHoy.map((c) => c.ruta_id));
  const rutasDisponibles = (rutas ?? []).filter((r) => !rutasConCajaHoy.has(r.id));

  const abrirMut = useMutation({
    mutationFn: () =>
      cajasApi.abrir({
        ruta_id: rutaSeleccionada,
        monto_apertura: parseFloat(montoApertura) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas-hoy'] });
      setShowModal(false);
      setRutaSeleccionada('');
      setMontoApertura('0');
    },
  });

  const errorMsg = abrirMut.isError
    ? ((abrirMut.error as { response?: { data?: { message?: string } } })?.response?.data?.message
       ?? t('cajas.error_abrir'))
    : null;

  const fmt = (n: number) => formatCurrency(n, user);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cajas.titulo')}</h1>
          <p className="text-sm text-gray-500">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cobros/nuevo" className="btn-secondary flex items-center gap-1.5">
            <PiggyBank size={15} />
            {t('cajas.registrar_cobro')}
          </Link>
          <button
            onClick={() => setShowModal(true)}
            disabled={rutasDisponibles.length === 0}
            title={rutasDisponibles.length === 0 ? t('cajas.todas_rutas_con_caja') : undefined}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusCircle size={16} />
            {t('cajas.abrir_caja')}
          </button>
        </div>
      </div>

      {misCajasHoy.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <AlertCircle size={15} className="text-blue-600 flex-shrink-0" />
            {t('cajas.tus_cajas_hoy', { count: misCajasHoy.length })}
          </p>
          <div className="space-y-1.5 pl-6">
            {misCajasHoy.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2.5 text-sm">
                <span className="text-blue-800">
                  {c.ruta?.nombre ?? t('cajas.sin_ruta')} —{' '}
                  {c.estado === 'Abierta' ? t('cajas.abierta') : t('cajas.cerrada_no_reabrir')}
                </span>
                <Link to={`/cajas/${c.id}/arqueo`} className="text-xs font-semibold text-blue-700 hover:underline flex-shrink-0">
                  {t('cajas.ver_arqueo')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">{errorMsg}</p>
        </div>
      )}

      <Table<Caja>
        columns={[
          {
            key: 'cobrador',
            header: t('cajas.col_cobrador'),
            render: (r) => r.cobrador ? `${r.cobrador.nombre} ${r.cobrador.apellido}` : '—',
          },
          {
            key: 'ruta',
            header: t('cajas.col_ruta'),
            render: (r) => <span className="text-gray-500">{r.ruta?.nombre ?? '—'}</span>,
          },
          {
            key: 'estado',
            header: t('cajas.col_estado'),
            render: (r) => (
              <Badge label={r.estado} variant={r.estado === 'Abierta' ? 'green' : 'gray'} />
            ),
          },
          {
            key: 'monto_apertura',
            header: t('cajas.col_apertura'),
            render: (r) => <span className="mono-nums">{fmt(r.monto_apertura)}</span>,
          },
          {
            key: 'total_cobros',
            header: t('cajas.col_cobros'),
            render: (r) => <span className="font-semibold text-emerald-600 mono-nums">{fmt(r.total_cobros)}</span>,
          },
          {
            key: 'total_gastos',
            header: t('cajas.col_gastos'),
            render: (r) => <span className="text-red-500 mono-nums">{fmt(r.total_gastos)}</span>,
          },
          {
            key: 'estado_cuadre',
            header: t('cajas.col_cuadre'),
            render: (r) =>
              r.estado_cuadre ? (
                <Badge
                  label={r.estado_cuadre}
                  variant={r.estado_cuadre === 'Cuadrado' ? 'green' : r.estado_cuadre === 'Sobrante' ? 'blue' : 'red'}
                />
              ) : (
                <span className="text-gray-400 text-xs">{t('cajas.abierta_cap')}</span>
              ),
          },
          {
            key: 'ver',
            header: '',
            render: (r) => (
              <Link to={`/cajas/${r.id}/arqueo`} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <Eye size={13} />
                {t('cajas.arqueo')}
              </Link>
            ),
          },
        ]}
        data={cajas ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage={t('cajas.sin_cajas_hoy')}
      />

      {/* Modal Abrir caja */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-5 animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{t('cajas.modal_abrir_titulo')}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label={t('prestamos.cerrar_aria')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('cajas.ruta_del_dia')} <span className="text-red-400">*</span>
                </label>
                <select
                  value={rutaSeleccionada}
                  onChange={(e) => setRutaSeleccionada(e.target.value)}
                  className="input-field"
                >
                  <option value="">{t('cajas.seleccionar_ruta')}</option>
                  {rutasDisponibles.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {t('cajas.rutas_sin_caja_hint')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('cajas.fondo_apertura', { simbolo: user?.tenant_simbolo_moneda ?? 'RD$' })}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  className="input-field mono-nums"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-400">{t('cajas.fondo_apertura_hint')}</p>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700">{errorMsg}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => abrirMut.mutate()}
                disabled={!rutaSeleccionada || abrirMut.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {abrirMut.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {t('cajas.abriendo')}
                  </>
                ) : (
                  t('cajas.abrir_caja')
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                {t('common.cancelar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
