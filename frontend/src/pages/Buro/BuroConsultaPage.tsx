import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buroApi } from '@/api/buro.api';
import { Badge, nivelRiesgoVariant } from '@/components/common/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function BuroConsultaPage() {
  const [cedula, setCedula] = useState('');

  const { data, mutate, isPending, error } = useMutation({
    mutationFn: (dto: { cedula: string }) =>
      buroApi.consultar(dto),
  });

  const RecomendacionBadge = ({ rec }: { rec: string }) => {
    if (rec === 'NO_PRESTAR')
      return (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-300 p-4">
          <ShieldX size={28} className="text-red-600" />
          <div>
            <p className="font-bold text-red-700 text-lg">NO PRESTAR</p>
            <p className="text-sm text-red-600">Historial crítico en el sistema</p>
          </div>
        </div>
      );
    if (rec === 'PRESTAR_CON_MUCHA_CAUTELA')
      return (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-300 p-4">
          <ShieldAlert size={28} className="text-amber-600" />
          <div>
            <p className="font-bold text-amber-700 text-lg">PRESTAR CON MUCHA CAUTELA</p>
            <p className="text-sm text-amber-600">Historial de riesgo alto — evalúe garantías</p>
          </div>
        </div>
      );
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-300 p-4">
        <Shield size={28} className="text-emerald-600" />
        <div>
          <p className="font-bold text-emerald-700 text-lg">SIN REPORTES NEGATIVOS</p>
          <p className="text-sm text-emerald-600">No hay alertas en el sistema</p>
        </div>
      </div>
    );
  };

  const fmt = (n: number | null | undefined) =>
    'RD$ ' + Number(n ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <Link to="/buro" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver al buró
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultar Historial Crediticio</h1>
        <p className="text-sm text-gray-500">
          Consulta cross-tenant — verifica en TODAS las agencias del sistema
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cédula del cliente</label>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="000-0000000-0"
            className="input-field"
          />
        </div>
        <button
          onClick={() => mutate({ cedula: cedula.trim() })}
          disabled={!cedula.trim() || isPending}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {isPending ? 'Consultando…' : 'Consultar'}
        </button>

        {error && (
          <p className="text-sm text-red-500">
            Error al consultar: {(error as { message?: string })?.message}
          </p>
        )}
      </div>

      {/* Resultado */}
      {data && (
        <div className="space-y-5">
          {/* Recomendación principal */}
          <RecomendacionBadge rec={data.recomendacion ?? ''} />

          {/* Perfil */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {data.nombre} {data.apellido} — {data.cedula}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Total reportes</p>
                <p className="font-bold text-gray-900 text-xl">{data.total_reportes}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Deuda activa total</p>
                <p className="font-bold text-red-600 text-xl">{fmt(data.deuda_pendiente_total ?? 0)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Riesgo consolidado</p>
                {data.nivel_riesgo_consolidado
                  ? <Badge label={data.nivel_riesgo_consolidado} variant={nivelRiesgoVariant(data.nivel_riesgo_consolidado)} />
                  : <span className="text-xs text-gray-400">Sin historial</span>}
              </div>
            </div>
          </div>

          {/* Reportes individuales */}
          {data.reportes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Reportes individuales ({data.reportes.length})
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
                        {r.deuda_saldada && <Badge label="Saldada" variant="green" />}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">{r.motivo}{r.descripcion_detallada ? ` — ${r.descripcion_detallada}` : ''}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Deuda original: {fmt(r.capital_original)}
                      {' · '}Reportado: {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: es })}
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
