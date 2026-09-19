import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2, CalendarDays, AlertCircle } from 'lucide-react';
import { feriadosApi } from '@/api/feriados.api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function FeriadosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: feriados = [], isLoading } = useQuery({
    queryKey: ['feriados'],
    queryFn: feriadosApi.listar,
  });

  const crearMut = useMutation({
    mutationFn: () => feriadosApi.crear({ fecha, descripcion: descripcion || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feriados'] });
      setShowForm(false);
      setFecha('');
      setDescripcion('');
    },
  });

  const eliminarMut = useMutation({
    mutationFn: (f: string) => feriadosApi.eliminar(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feriados'] });
      setDeleteTarget(null);
    },
  });

  const crearErr = crearMut.isError
    ? ((crearMut.error as any)?.response?.data?.message ?? t('feriados.error_crear'))
    : null;

  // Separate tenant feriados from global (tenant_id null = global)
  const feriadosGlobales = feriados.filter((f) => f.tenant_id === null);
  const feriadosTenant  = feriados.filter((f) => f.tenant_id !== null);

  const fmtFecha = (f: string) => {
    try { return format(parseISO(f), "dd 'de' MMMM yyyy", { locale: es }); }
    catch { return f; }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <Link to="/config" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('feriados.volver_config')}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('feriados.titulo')}</h1>
          <p className="text-sm text-gray-500">{t('feriados.subtitulo')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <PlusCircle size={15} />
          {t('feriados.agregar')}
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="card p-5 space-y-4 border-brand-200 ring-1 ring-brand-100 animate-fade-in">
          <h2 className="text-sm font-bold text-gray-900">{t('feriados.nuevo_titulo')}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('feriados.fecha')} <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {t('feriados.descripcion')}
              </label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t('feriados.descripcion_placeholder')}
                className="input-field"
                maxLength={100}
              />
            </div>
          </div>

          {crearErr && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={14} />
              {Array.isArray(crearErr) ? crearErr.join(', ') : crearErr}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => crearMut.mutate()}
              disabled={!fecha || crearMut.isPending}
              className="btn-primary"
            >
              {crearMut.isPending ? t('feriados.guardando') : t('feriados.guardar')}
            </button>
            <button onClick={() => { setShowForm(false); setFecha(''); setDescripcion(''); }} className="btn-secondary">
              {t('feriados.cancelar')}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Feriados propios del tenant */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {t('feriados.propios_titulo', { count: feriadosTenant.length })}
            </h2>

            {feriadosTenant.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                <CalendarDays size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t('feriados.sin_propios')}</p>
                <p className="text-xs text-gray-300 mt-0.5">{t('feriados.sin_propios_sub')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-50">
                {feriadosTenant.map((f) => (
                  <div key={f.fecha} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{fmtFecha(f.fecha)}</p>
                      {f.descripcion && <p className="text-xs text-gray-400 mt-0.5">{f.descripcion}</p>}
                    </div>
                    {deleteTarget === f.fecha ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('feriados.confirmar_eliminar')}</span>
                        <button
                          onClick={() => eliminarMut.mutate(f.fecha)}
                          disabled={eliminarMut.isPending}
                          className="text-xs text-red-600 font-semibold hover:text-red-800"
                        >
                          {eliminarMut.isPending ? t('feriados.eliminando') : t('feriados.si_eliminar')}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {t('feriados.cancelar')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(f.fecha)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={t('feriados.eliminar_tooltip')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feriados nacionales (globales, no editables) */}
          {feriadosGlobales.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {t('feriados.nacionales_titulo', { count: feriadosGlobales.length })}
              </h2>
              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                {feriadosGlobales.map((f) => (
                  <div key={f.fecha} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm text-gray-700">{fmtFecha(f.fecha)}</p>
                      {f.descripcion && <p className="text-xs text-gray-400">{f.descripcion}</p>}
                    </div>
                    <span className="text-[10px] text-gray-300 bg-gray-100 rounded-full px-2 py-0.5">{t('feriados.nacional_badge')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
