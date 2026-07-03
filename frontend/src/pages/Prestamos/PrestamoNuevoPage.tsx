import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Calculator } from 'lucide-react';
import { prestamosApi } from '@/api/prestamos.api';
import { clientesApi } from '@/api/clientes.api';
import { rutasApi } from '@/api/rutas.api';
import { CalculadoraPrestamo } from '@/components/common/CalculadoraPrestamo';
import { useAuth } from '@/hooks/useAuth';
import { Rol } from '@/types';
import { useState } from 'react';

const MODALIDADES = ['Diario', 'Semanal', 'Quincenal', 'Mensual'] as const;

const schema = z.object({
  cliente_id:         z.string().uuid('Selecciona un cliente válido'),
  ruta_id:             z.string().uuid('Selecciona una ruta válida'),
  capital_solicitado: z.coerce.number().min(100, 'Mínimo RD$ 100').max(10_000_000),
  tasa_interes:       z.coerce.number().min(0.1, 'Mínimo 0.1%').max(100),
  num_cuotas:         z.coerce.number().int().min(1).max(520),
  modalidad:          z.enum(MODALIDADES),
  proposito:          z.string().max(300).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function PrestamoNuevoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const preselectedClienteId = params.get('cliente_id') ?? '';
  const [showCalc, setShowCalc] = useState(false);
  const { user } = useAuth();
  const esCobrador = user?.rol === Rol.COBRADOR_TENANT;

  // Un cobrador no tiene acceso a /clientes ni /rutas (listados de todo el
  // tenant, admin/supervisor only) — debe ver solo sus propias rutas y los
  // clientes de esas rutas.
  const { data: clientesAdmin } = useQuery({
    queryKey: ['clientes-all'],
    queryFn: () => clientesApi.listar({ limit: 200 }),
    enabled: !esCobrador,
  });

  const { data: rutasAdmin } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => rutasApi.listar(),
    enabled: !esCobrador,
  });

  const { data: rutasCobrador } = useQuery({
    queryKey: ['mis-rutas'],
    queryFn: rutasApi.misRutas,
    enabled: esCobrador,
  });

  const { data: clientesCobrador } = useQuery({
    queryKey: ['clientes-mis-rutas', rutasCobrador?.map((r) => r.id)],
    queryFn: async () => {
      const porRuta = await Promise.all((rutasCobrador ?? []).map((r) => clientesApi.porRuta(r.id)));
      return porRuta.flat();
    },
    enabled: esCobrador && !!rutasCobrador,
  });

  const rutas = esCobrador ? rutasCobrador : rutasAdmin;
  const clientes = esCobrador
    ? { data: clientesCobrador ?? [] }
    : clientesAdmin;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id:         preselectedClienteId,
      ruta_id:            '',
      capital_solicitado: 5000,
      tasa_interes:       5,
      num_cuotas:         12,
      modalidad:          'Mensual',
      proposito:          '',
    },
  });

  const capital    = Number(watch('capital_solicitado')) || 0;
  const tasa       = Number(watch('tasa_interes')) || 0;
  const cuotas     = Number(watch('num_cuotas')) || 0;
  const modalidad  = watch('modalidad');

  // Estimación simple de cuota
  const cuotaEst = capital && tasa && cuotas
    ? ((capital * (tasa / 100)) + capital) / cuotas
    : 0;

  const crear = useMutation({
    mutationFn: (dto: FormData) =>
      prestamosApi.crearSolicitud({
        cliente_id:           dto.cliente_id,
        ruta_id:              dto.ruta_id,
        capital_solicitado:   dto.capital_solicitado,
        numero_cuotas:        dto.num_cuotas,
        modalidad:            dto.modalidad,
        tasa_interes_propuesta: dto.tasa_interes,
        notas:                dto.proposito || undefined,
      }),
    onSuccess: (prestamo) => {
      qc.invalidateQueries({ queryKey: ['prestamos'] });
      navigate(`/prestamos/${prestamo.id}`);
    },
  });

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link to="/prestamos" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft size={15} />
          Volver a préstamos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva solicitud de préstamo</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completa los datos para registrar la solicitud</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => crear.mutate(d))}
        className="card p-6 space-y-5"
      >
        {/* Cliente */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Cliente <span className="text-red-400">*</span>
          </label>
          <select {...register('cliente_id')} className="input-field">
            <option value="">— Seleccionar cliente —</option>
            {clientes?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido} — {c.cedula}
              </option>
            ))}
          </select>
          {errors.cliente_id && <p className="mt-1 text-xs text-red-500">{errors.cliente_id.message}</p>}
        </div>

        {/* Ruta */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Ruta de cobro <span className="text-red-400">*</span>
          </label>
          <select {...register('ruta_id')} className="input-field">
            <option value="">— Seleccionar ruta —</option>
            {rutas?.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          {errors.ruta_id && <p className="mt-1 text-xs text-red-500">{errors.ruta_id.message}</p>}
        </div>

        {/* Capital + Tasa */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Capital solicitado (RD$) <span className="text-red-400">*</span>
            </label>
            <input
              {...register('capital_solicitado')}
              type="number"
              step="0.01"
              min="100"
              className="input-field mono-nums"
            />
            {errors.capital_solicitado && <p className="mt-1 text-xs text-red-500">{errors.capital_solicitado.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Tasa de interés (%) <span className="text-red-400">*</span>
            </label>
            <input
              {...register('tasa_interes')}
              type="number"
              step="0.01"
              min="0.1"
              className="input-field mono-nums"
            />
            {errors.tasa_interes && <p className="mt-1 text-xs text-red-500">{errors.tasa_interes.message}</p>}
            <p className="mt-1 text-xs text-gray-400">Propuesta — el administrador confirma la tasa final al aprobar</p>
          </div>
        </div>

        {/* Cuotas + Modalidad */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Número de cuotas <span className="text-red-400">*</span>
            </label>
            <input
              {...register('num_cuotas')}
              type="number"
              min="1"
              className="input-field mono-nums"
            />
            {errors.num_cuotas && <p className="mt-1 text-xs text-red-500">{errors.num_cuotas.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Modalidad <span className="text-red-400">*</span>
            </label>
            <select {...register('modalidad')} className="input-field">
              {MODALIDADES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Propósito */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Propósito del préstamo
          </label>
          <textarea
            {...register('proposito')}
            rows={2}
            placeholder="Capital de trabajo, mejoras del hogar, compra de equipos…"
            className="input-field resize-none"
          />
        </div>

        {/* Estimación rápida */}
        {capital > 0 && tasa > 0 && cuotas > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Estimación ({modalidad})</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-blue-400">Capital</p>
                <p className="font-bold text-blue-800 text-sm mono-nums">{fmt(capital)}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400">Interés total</p>
                <p className="font-bold text-blue-800 text-sm mono-nums">{fmt(capital * (tasa / 100))}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400">Cuota aprox.</p>
                <p className="font-bold text-blue-800 text-sm mono-nums">{fmt(cuotaEst)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calculadora */}
        <div>
          <button
            type="button"
            onClick={() => setShowCalc(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
          >
            <Calculator size={13} />
            {showCalc ? 'Ocultar' : 'Abrir'} calculadora de amortización
          </button>
          {showCalc && (
            <div className="mt-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
              <CalculadoraPrestamo />
            </div>
          )}
        </div>

        {/* Error servidor */}
        {crear.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {(crear.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Error al crear la solicitud. Verifica los datos.'}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={crear.isPending} className="btn-primary">
            {crear.isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Creando solicitud…
              </>
            ) : (
              <>
                <CreditCard size={15} />
                Crear solicitud
              </>
            )}
          </button>
          <Link to="/prestamos" className="btn-secondary text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
