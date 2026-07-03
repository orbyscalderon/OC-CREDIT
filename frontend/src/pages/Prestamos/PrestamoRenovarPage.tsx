import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { prestamosApi } from '@/api/prestamos.api';
import { empleadosApi } from '@/api/empleados.api';

const MODALIDADES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'] as const;

function mañana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function PrestamoRenovarPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    ? ((renovarMut.error as any)?.response?.data?.message ?? 'Error al renovar el préstamo')
    : null;

  const fmt = (n: number) => 'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const canSubmit = capitalAprobado && numCuotas && tasaInteres && cobradorId && fechaPrimerPago;

  if (isLoading) return <div className="p-6 text-gray-400">Cargando…</div>;
  if (!prestamo) return <div className="p-6 text-red-500">Préstamo no encontrado</div>;

  if (resultado) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-4">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Préstamo renovado</h2>
          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">Saldo liquidado</p>
              <p className="font-bold text-gray-900">{fmt(resultado.saldoLiquidado)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-gray-400 text-xs">Neto entregado</p>
              <p className="font-bold text-emerald-700">{fmt(resultado.capitalNeto)}</p>
            </div>
          </div>
          <button onClick={() => navigate('/prestamos')} className="btn-primary w-full justify-center mt-2">
            Ver préstamos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <Link to={`/prestamos/${id}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver al préstamo
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Renovar préstamo</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {prestamo.cliente
            ? `${prestamo.cliente.nombre} ${prestamo.cliente.apellido} — ${prestamo.cliente.cedula}`
            : 'Liquida el saldo actual y crea un nuevo plan de pago'}
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Nuevo capital aprobado (RD$) <span className="text-red-400">*</span>
            </label>
            <input
              type="number" step="0.01" min="1"
              value={capitalAprobado}
              onChange={(e) => setCapitalAprobado(e.target.value)}
              className="input-field mono-nums"
            />
            <p className="mt-1 text-xs text-gray-400">Debe ser mayor al saldo pendiente actual</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tasa de interés (%) <span className="text-red-400">*</span>
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
              Número de cuotas <span className="text-red-400">*</span>
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
              Modalidad <span className="text-red-400">*</span>
            </label>
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value as typeof modalidad)} className="input-field">
              {MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Cobrador asignado <span className="text-red-400">*</span>
            </label>
            <select value={cobradorId} onChange={(e) => setCobradorId(e.target.value)} className="input-field">
              <option value="">— Seleccionar —</option>
              {cobradores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
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
          {renovarMut.isPending ? 'Renovando…' : 'Confirmar renovación'}
        </button>
      </div>
    </div>
  );
}
