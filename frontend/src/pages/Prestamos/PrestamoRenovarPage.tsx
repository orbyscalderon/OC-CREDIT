import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { prestamosApi } from '@/api/prestamos.api';
import { empleadosApi } from '@/api/empleados.api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';

const MODALIDADES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'] as const;

function mañana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function PrestamoRenovarPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [capitalAprobado, setCapitalAprobado] = useState('');
  const [modalidad, setModalidad] = useState<typeof MODALIDADES[number]>('Mensual');
  const [numCuotas, setNumCuotas] = useState('12');
  const [tasaInteres, setTasaInteres] = useState('5');
  const [cobradorId, setCobradorId] = useState('');
  const [fechaPrimerPago, setFechaPrimerPago] = useState(mañana());
  const [resultado, setResultado] = useState<{ capitalNeto: number; saldoLiquidado: number } | null>(null);

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

  const renovarMut = useMutation({
    mutationFn: () =>
      prestamosApi.renovar({
        cliente_id: prestamo!.cliente_id,
        capital_aprobado: parseFloat(capitalAprobado) || 0,
        modalidad,
        numero_cuotas: parseInt(numCuotas, 10) || 0,
        tasa_interes: parseFloat(tasaInteres) || 0,
        cobrador_id: cobradorId,
        fecha_primer_pago: fechaPrimerPago,
      }),
    onSuccess: (data: any) => {
      setResultado({
        capitalNeto: data.capital_neto_entregado,
        saldoLiquidado: data.saldo_liquidado,
      });
    },
  });

  const errMsg = renovarMut.isError
    ? ((renovarMut.error as any)?.response?.data?.message ?? t('prestamos.error_renovar'))
    : null;

  const fmt = (n: number) => formatCurrency(n, user);

  const canSubmit = capitalAprobado && numCuotas && tasaInteres && cobradorId && fechaPrimerPago;

  if (isLoading) return <div className="p-6 text-gray-400">{t('prestamos.cargando')}</div>;
  if (!prestamo) return <div className="p-6 text-red-500">{t('prestamos.no_encontrado')}</div>;

  if (resultado) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-4">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">{t('prestamos.renovado_titulo')}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">{t('prestamos.saldo_liquidado')}</p>
              <p className="font-bold text-gray-900">{fmt(resultado.saldoLiquidado)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-gray-400 text-xs">{t('prestamos.neto_entregado')}</p>
              <p className="font-bold text-emerald-700">{fmt(resultado.capitalNeto)}</p>
            </div>
          </div>
          <button onClick={() => navigate('/prestamos')} className="btn-primary w-full justify-center mt-2">
            {t('prestamos.ver_prestamos')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <Link to={`/prestamos/${id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('prestamos.volver_al_prestamo')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('prestamos.renovar_titulo')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {prestamo.cliente
            ? `${prestamo.cliente.nombre} ${prestamo.cliente.apellido} — ${prestamo.cliente.cedula}`
            : t('prestamos.renovar_subtitulo_generico')}
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.nuevo_capital_aprobado', { simbolo: user?.tenant_simbolo_moneda ?? 'RD$' })} <span className="text-red-400">*</span>
            </label>
            <input
              type="number" step="0.01" min="1"
              value={capitalAprobado}
              onChange={(e) => setCapitalAprobado(e.target.value)}
              className="input-field mono-nums"
            />
            <p className="mt-1 text-xs text-gray-400">{t('prestamos.capital_hint')}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.tasa_interes')} <span className="text-red-400">*</span>
            </label>
            <input
              type="number" step="0.01" min="0.1"
              value={tasaInteres}
              onChange={(e) => setTasaInteres(e.target.value)}
              className="input-field mono-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.numero_cuotas')} <span className="text-red-400">*</span>
            </label>
            <input
              type="number" min="1"
              value={numCuotas}
              onChange={(e) => setNumCuotas(e.target.value)}
              className="input-field mono-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.modalidad')} <span className="text-red-400">*</span>
            </label>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value as typeof modalidad)} className="input-field">
              {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.cobrador_asignado')} <span className="text-red-400">*</span>
            </label>
            <select value={cobradorId} onChange={(e) => setCobradorId(e.target.value)} className="input-field">
              <option value="">{t('rutas.seleccionar_placeholder')}</option>
              {cobradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('prestamos.primer_pago')} <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={fechaPrimerPago}
              onChange={(e) => setFechaPrimerPago(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {errMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={15} className="text-red-500" />
            <p className="text-sm text-red-700">{Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}</p>
          </div>
        )}

        <button
          onClick={() => renovarMut.mutate()}
          disabled={!canSubmit || renovarMut.isPending}
          className="btn-primary w-full justify-center"
        >
          <RotateCcw size={15} />
          {renovarMut.isPending ? t('prestamos.renovando') : t('prestamos.confirmar_renovacion')}
        </button>
      </div>
    </div>
  );
}
