import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buroApi } from '@/api/buro.api';
import { Badge, nivelRiesgoVariant } from '@/components/common/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { tipoDocumentoPorPais } from '@/utils/documentosIdentidad';
import { formatCurrency } from '@/utils/format';

export function BuroConsultaPage() {
  const { t } = useTranslation();
  const [cedula, setCedula] = useState('');
  const { user } = useAuth();
  const tipoDoc = tipoDocumentoPorPais(user?.tenant_pais);

  const { data, mutate, isPending, error } = useMutation({
    mutationFn: (dto: { cedula: string; tipo_documento?: string }) =>
      buroApi.consultar(dto),
  });

  const RecomendacionBadge = ({ rec }: { rec: string }) => {
    if (rec === 'NO_PRESTAR')
      return (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-300 p-4">
          <ShieldX size={28} className="text-red-600" />
          <div>
            <p className="font-bold text-red-700 text-lg">{t('buro.no_prestar')}</p>
            <p className="text-sm text-red-600">{t('buro.no_prestar_desc')}</p>
          </div>
        </div>
      );
    if (rec === 'PRESTAR_CON_MUCHA_CAUTELA')
      return (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-300 p-4">
          <ShieldAlert size={28} className="text-amber-600" />
          <div>
            <p className="font-bold text-amber-700 text-lg">{t('buro.prestar_cautela')}</p>
            <p className="text-sm text-amber-600">{t('buro.prestar_cautela_desc')}</p>
          </div>
        </div>
      );
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-300 p-4">
        <Shield size={28} className="text-emerald-600" />
        <div>
          <p className="font-bold text-emerald-700 text-lg">{t('buro.sin_reportes_negativos')}</p>
          <p className="text-sm text-emerald-600">{t('buro.sin_alertas_sistema')}</p>
        </div>
      </div>
    );
  };

  const fmt = (n: number | null | undefined) => formatCurrency(n, user);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link to="/buro" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('buro.volver')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('buro.consultar_titulo')}</h1>
        <p className="text-sm text-gray-500">
          {t('buro.consultar_subtitulo')}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('buro.cliente_label', { tipo: tipoDoc.etiqueta })}</label>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder={tipoDoc.placeholder}
            className="input-field"
          />
        </div>
        <button
          onClick={() => mutate({ cedula: cedula.trim(), tipo_documento: tipoDoc.codigo })}
          disabled={!cedula.trim() || isPending}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? t('buro.consultando') : t('buro.consultar')}
        </button>

        {error && (
          <p className="text-sm text-red-500">
            {t('buro.error_consultar', { msg: (error as { message?: string })?.message })}
          </p>
        )}
      </div>

      {/* Resultado */}
      {data && (
        <div className="space-y-5">
          {/* Recomendación principal */}
          <RecomendacionBadge rec={data.recomendacion ?? ''} />

          {/* Cliente propio -- si la cédula ya es cliente de este tenant, se
              muestra su info aunque no tenga ningún reporte de buró activo */}
          {data.cliente_propio && (
            <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
                {t('buro.ya_es_cliente')}
              </p>
              <Link
                to={`/clientes/${data.cliente_propio.id}`}
                className="font-semibold text-gray-900 hover:text-brand-700"
              >
                {data.cliente_propio.nombre} {data.cliente_propio.apellido}
              </Link>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                {data.cliente_propio.telefono && <span>{data.cliente_propio.telefono}</span>}
                {data.cliente_propio.direccion_casa && <span>{data.cliente_propio.direccion_casa}</span>}
              </div>
            </div>
          )}

          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {data.nombre || data.apellido ? `${data.nombre} ${data.apellido} — ${data.cedula}` : data.cedula}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">{t('buro.total_reportes')}</p>
                <p className="font-bold text-gray-900 text-xl">{data.total_reportes}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{t('buro.deuda_activa_total')}</p>
                <p className="font-bold text-red-600 text-xl">{fmt(data.deuda_pendiente_total ?? 0)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">{t('buro.riesgo_consolidado')}</p>
                {data.nivel_riesgo_consolidado
                  ? <Badge label={data.nivel_riesgo_consolidado} variant={nivelRiesgoVariant(data.nivel_riesgo_consolidado)} />
                  : <span className="text-xs text-gray-400">{t('buro.sin_historial')}</span>}
              </div>
            </div>
          </div>

          {/* Reportes individuales */}
          {data.reportes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {t('buro.reportes_individuales', { count: data.reportes.length })}
              </h3>
              <div className="space-y-3">
                {data.reportes.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">{r.tenant_nombre}</p>
                      <div className="flex items-center gap-2">
                        <Badge label={r.nivel_riesgo} variant={nivelRiesgoVariant(r.nivel_riesgo)} />
                        {r.deuda_saldada && <Badge label={t('buro.saldada_badge')} variant="green" />}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{r.motivo}{r.descripcion_detallada ? ` — ${r.descripcion_detallada}` : ''}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {t('buro.deuda_original_reportado', { monto: fmt(r.capital_original), fecha: format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es }) })}
                    </p>
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
