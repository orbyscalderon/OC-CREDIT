import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { cobrosApi } from '@/api/cobros.api';
import { cajasApi } from '@/api/cajas.api';
import { clientesApi } from '@/api/clientes.api';
import { prestamosApi } from '@/api/prestamos.api';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import { Rol } from '@/types';

export function CobroNuevoPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const esCobrador = user?.rol === Rol.COBRADOR_TENANT;

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteIdSel, setClienteIdSel] = useState(params.get('cliente_id') ?? '');
  const [prestamoId, setPrestamoId] = useState(params.get('prestamo_id') ?? '');
  const [cajaId, setCajaId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [resultado, setResultado] = useState<{ capital: number; interes: number; mora: number } | null>(null);

  // Cajas abiertas: un cobrador solo ve las suyas (/cajas/dia le está vedado,
  // mostraría las de todo el tenant).
  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas-hoy', esCobrador],
    queryFn: () => (esCobrador ? cajasApi.misCajasActivas() : cajasApi.listarDelDia()),
    select: (data) => data.filter((c) => c.estado === 'Abierta'),
  });

  // Búsqueda de clientes
  const { data: clientesFound = [], isFetching: buscando } = useQuery({
    queryKey: ['buscar-clientes', clienteSearch],
    queryFn: () => clientesApi.buscar(clienteSearch),
    enabled: clienteSearch.length >= 2,
  });

  // Préstamos activos del cliente seleccionado
  const { data: prestamosResp } = useQuery({
    queryKey: ['prestamos-cliente', clienteIdSel],
    queryFn: () => prestamosApi.listar({ cliente_id: clienteIdSel, estado: 'Activo', limit: 50 }),
    enabled: !!clienteIdSel,
    select: (d) => d.data.filter((p) => p.estado === 'Activo'),
  });

  const prestamoSel = prestamosResp?.find((p) => p.id === prestamoId);

  // El cobro debe entrar en la caja del cobrador asignado a ESTE préstamo —
  // mostrar las demás cajas del tenant solo confunde y el backend las
  // rechazaría igual. Si el cobrador tiene varias rutas/cajas hoy, se
  // muestran todas las suyas para elegir.
  const cajasRelevantes = prestamoSel
    ? cajas.filter((c) => c.cobrador_id === prestamoSel.cobrador_id)
    : cajas;

  useEffect(() => {
    setCajaId(cajasRelevantes.length === 1 ? cajasRelevantes[0].id : '');
  }, [prestamoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => 'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const registrarMut = useMutation({
    mutationFn: () => cobrosApi.registrar({
      uuid_idempotencia: crypto.randomUUID(),
      prestamo_id: prestamoId,
      caja_id: cajaId,
      monto_cobrado: parseFloat(monto) || 0,
      descripcion: descripcion || undefined,
    }),
    onSuccess: (data) => {
      setResultado({
        capital: data.distribucion.capital_absorbido,
        interes: data.distribucion.interes_absorbido,
        mora: data.distribucion.mora_absorbida,
      });
    },
  });

  const errMsg = registrarMut.isError
    ? ((registrarMut.error as any)?.response?.data?.message ?? 'Error al registrar cobro')
    : null;

  const canSubmit = prestamoId && cajaId && parseFloat(monto) > 0;

  if (resultado) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-4">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Cobro registrado</h2>
          <div className="grid grid-cols-3 gap-3 text-sm mt-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-400 text-xs">Capital</p>
              <p className="font-bold text-gray-900">{fmt(resultado.capital)}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-gray-400 text-xs">Interés</p>
              <p className="font-bold text-blue-600">{fmt(resultado.interes)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-gray-400 text-xs">Mora</p>
              <p className="font-bold text-amber-600">{fmt(resultado.mora)}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setResultado(null); setMonto(''); setDescripcion(''); }} className="btn-secondary flex-1 justify-center">
              Registrar otro
            </button>
            <button onClick={() => navigate('/cajas')} className="btn-primary flex-1 justify-center">
              Ver cajas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <Link to="/cajas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a cajas
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registrar cobro</h1>
        <p className="text-sm text-gray-500">Cobro manual desde el panel administrativo</p>
      </div>

      <div className="card p-6 space-y-5">
        {/* Paso 1: Cliente */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            1. Buscar cliente
          </label>
          <input
            value={clienteSearch}
            onChange={(e) => { setClienteSearch(e.target.value); setClienteIdSel(''); setPrestamoId(''); }}
            placeholder="Nombre, apellido o cédula…"
            className="input-field"
          />
          {clienteSearch.length >= 2 && (
            <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {buscando ? (
                <div className="px-3 py-2 text-sm text-gray-400">Buscando…</div>
              ) : clientesFound.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
              ) : (
                clientesFound.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClienteIdSel(c.id); setClienteSearch(`${c.nombre} ${c.apellido}`); setPrestamoId(''); }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-medium">{c.nombre} {c.apellido}</span>
                    <span className="text-gray-400 ml-2">{c.cedula}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Paso 2: Préstamo */}
        {clienteIdSel && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              2. Préstamo a cobrar
            </label>
            {!prestamosResp || prestamosResp.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Este cliente no tiene préstamos activos
              </p>
            ) : (
              <div className="space-y-2">
                {prestamosResp.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPrestamoId(p.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                      prestamoId === p.id
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400'
                        : 'border-gray-200 hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        RD$ {p.capital_aprobado.toLocaleString('es-DO')}
                      </span>
                      <Badge label={p.estado} variant={estadoPrestamoVariant(p.estado)} />
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {p.modalidad} · {p.num_cuotas} cuotas · #{p.id.slice(-8).toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Caja */}
        {prestamoId && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              3. Caja del cobrador asignado
            </label>
            {cajasRelevantes.length === 0 ? (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                El cobrador asignado a este préstamo no tiene una caja abierta hoy.{' '}
                <Link to="/cajas" className="underline font-medium">Ver cajas</Link>
              </p>
            ) : (
              <select value={cajaId} onChange={(e) => setCajaId(e.target.value)} className="input-field">
                <option value="">— Seleccionar caja —</option>
                {cajasRelevantes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cobrador?.nombre} {c.cobrador?.apellido}
                    {c.ruta?.nombre ? ` — ${c.ruta.nombre}` : ''} — apertura RD$ {c.monto_apertura.toLocaleString('es-DO')}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Paso 4: Monto */}
        {cajaId && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                4. Monto cobrado (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="input-field mono-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Observación (opcional)
              </label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Pagó en efectivo en oficina"
                className="input-field"
                maxLength={200}
              />
            </div>
          </div>
        )}

        {errMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={15} className="text-red-500" />
            <p className="text-sm text-red-700">{Array.isArray(errMsg) ? errMsg.join(', ') : errMsg}</p>
          </div>
        )}

        <button
          onClick={() => registrarMut.mutate()}
          disabled={!canSubmit || registrarMut.isPending}
          className="btn-primary w-full justify-center"
        >
          {registrarMut.isPending ? 'Registrando…' : 'Registrar cobro'}
        </button>
      </div>
    </div>
  );
}
