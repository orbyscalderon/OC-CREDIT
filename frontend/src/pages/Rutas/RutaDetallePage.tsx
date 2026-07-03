import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Map, UserCheck, Users, AlertCircle } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';
import { clientesApi } from '@/api/clientes.api';
import { empleadosApi } from '@/api/empleados.api';
import { Badge } from '@/components/common/Badge';

export function RutaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [cobradorId, setCobradorId] = useState('');

  const { data: ruta, isLoading: loadingRuta } = useQuery({
    queryKey: ['ruta', id],
    queryFn: () => rutasApi.obtener(id!),
    enabled: !!id,
  });

  const { data: clientes = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-ruta', id],
    queryFn: () => clientesApi.porRuta(id!),
    enabled: !!id,
  });

  const { data: cobradores = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: empleadosApi.listar,
    select: (data) => data.filter((e) => e.activo && e.rol === 'cobrador_tenant'),
  });

  const asignarMut = useMutation({
    mutationFn: () => rutasApi.asignarCobrador(id!, cobradorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ruta', id] });
      qc.invalidateQueries({ queryKey: ['rutas'] });
    },
  });

  const asignarErr = asignarMut.isError
    ? ((asignarMut.error as any)?.response?.data?.message ?? 'Error al asignar cobrador')
    : null;

  if (loadingRuta) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="p-6">
        <p className="text-red-500">Ruta no encontrada</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Link to="/rutas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a rutas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ruta.nombre}</h1>
          {ruta.descripcion && <p className="text-sm text-gray-500 mt-0.5">{ruta.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge label={ruta.activa ? 'Activa' : 'Inactiva'} variant={ruta.activa ? 'green' : 'gray'} />
          <Link to={`/rutas/${id}/mapa`} className="btn-secondary flex items-center gap-1.5">
            <Map size={14} />
            Ver mapa
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Asignar cobrador */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-brand-500" />
            <h2 className="text-sm font-bold text-gray-900">Cobrador asignado</h2>
          </div>

          {ruta.cobrador ? (
            <div className="rounded-lg bg-brand-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-brand-800">
                {ruta.cobrador.nombre} {ruta.cobrador.apellido}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">Cobrador activo</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin cobrador asignado</p>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Cambiar cobrador
            </label>
            <select
              value={cobradorId}
              onChange={(e) => setCobradorId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">— Seleccionar —</option>
              {cobradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>

            {asignarErr && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={12} />
                {asignarErr}
              </div>
            )}

            <button
              onClick={() => asignarMut.mutate()}
              disabled={!cobradorId || asignarMut.isPending}
              className="btn-primary w-full justify-center text-sm"
            >
              {asignarMut.isPending ? 'Asignando…' : 'Asignar cobrador'}
            </button>

            {asignarMut.isSuccess && (
              <p className="text-xs text-emerald-600 text-center">Cobrador asignado correctamente</p>
            )}
          </div>
        </div>

        {/* Clientes en la ruta */}
        <div className="card p-5 md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-gray-900">
                Clientes en la ruta
              </h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {clientes.length} clientes
            </span>
          </div>

          {loadingClientes ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-11 rounded-lg" />)}
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Sin clientes en esta ruta</p>
              <p className="text-xs text-gray-300 mt-1">
                Asigna clientes desde el detalle de cada cliente
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {c.nombre} {c.apellido}
                    </p>
                    <p className="text-xs text-gray-400">{c.cedula ?? 'Sin cédula'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      label={c.activo ? 'Activo' : 'Inactivo'}
                      variant={c.activo ? 'green' : 'gray'}
                    />
                    <Link
                      to={`/clientes/${c.id}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
