import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Map, UserCheck, Users, AlertCircle,
  GripVertical, Shuffle, History, ArrowRightLeft,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rutasApi } from '@/api/rutas.api';
import { clientesApi } from '@/api/clientes.api';
import { empleadosApi } from '@/api/empleados.api';
import { Badge } from '@/components/common/Badge';
import { Table } from '@/components/common/Table';
import type { Cliente, HistorialCobradorRuta } from '@/types';

export function RutaDetallePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [cobradorId, setCobradorId] = useState('');
  const [ordenLocal, setOrdenLocal] = useState<Cliente[]>([]);
  const [moviendoId, setMoviendoId] = useState<string | null>(null);
  const [rutaDestinoPorCliente, setRutaDestinoPorCliente] = useState<Record<string, string>>({});

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

  // El orden mostrado se maneja localmente para que arrastrar se sienta
  // instantáneo; se resincroniza cada vez que el servidor manda datos nuevos.
  useEffect(() => setOrdenLocal(clientes), [clientes]);

  const { data: cobradores = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: empleadosApi.listar,
    select: (data) => data.filter((e) => e.activo && e.rol === 'cobrador_tenant'),
  });

  const { data: otrasRutas = [] } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => rutasApi.listar(),
    select: (data) => data.filter((r) => r.id !== id),
  });

  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['ruta-historial-cobrador', id],
    queryFn: () => rutasApi.historialCobrador(id!),
    enabled: !!id,
  });

  const asignarMut = useMutation({
    mutationFn: () => rutasApi.asignarCobrador(id!, cobradorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ruta', id] });
      qc.invalidateQueries({ queryKey: ['rutas'] });
      qc.invalidateQueries({ queryKey: ['ruta-historial-cobrador', id] });
    },
  });

  const reordenarMut = useMutation({
    mutationFn: (orden: string[]) => clientesApi.reordenar(id!, orden),
    onSuccess: (data) => {
      setOrdenLocal(data);
      qc.invalidateQueries({ queryKey: ['clientes-ruta', id] });
    },
  });

  const autoOrdenarMut = useMutation({
    mutationFn: () => clientesApi.ordenarAutomatico(id!),
    onSuccess: (data) => {
      setOrdenLocal(data);
      qc.invalidateQueries({ queryKey: ['clientes-ruta', id] });
    },
  });

  const moverMut = useMutation({
    mutationFn: ({ clienteId, rutaId }: { clienteId: string; rutaId: string }) =>
      clientesApi.reasignarRuta(clienteId, rutaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes-ruta', id] });
      setMoviendoId(null);
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordenLocal.findIndex((c) => c.id === active.id);
    const newIndex = ordenLocal.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordenado = arrayMove(ordenLocal, oldIndex, newIndex);
    setOrdenLocal(reordenado); // optimista
    reordenarMut.mutate(reordenado.map((c) => c.id));
  };

  const asignarErr = asignarMut.isError
    ? ((asignarMut.error as any)?.response?.data?.message ?? t('rutas.error_asignar'))
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
        <p className="text-red-500">{t('rutas.ruta_no_encontrada')}</p>
      </div>
    );
  }

  const historialColumns = [
    {
      key: 'created_at', header: t('rutas.col_fecha'),
      render: (h: HistorialCobradorRuta) => new Date(h.created_at).toLocaleString('es-DO', {
        dateStyle: 'medium', timeStyle: 'short',
      }),
    },
    {
      key: 'cobrador_anterior_nombre', header: t('rutas.col_cobrador_anterior'),
      render: (h: HistorialCobradorRuta) => h.cobrador_anterior_nombre ?? t('rutas.sin_asignar_paren'),
    },
    { key: 'cobrador_nuevo_nombre', header: t('rutas.col_cobrador_nuevo') },
    {
      key: 'cambiado_por_nombre', header: t('rutas.col_cambiado_por'),
      render: (h: HistorialCobradorRuta) => h.cambiado_por_nombre ?? '—',
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Link to="/rutas" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        {t('rutas.volver')}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ruta.nombre}</h1>
          {ruta.descripcion && <p className="text-sm text-gray-500 mt-0.5">{ruta.descripcion}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge label={ruta.activa ? t('rutas.activa') : t('rutas.inactiva')} variant={ruta.activa ? 'green' : 'gray'} />
          <Link to={`/rutas/${id}/mapa`} className="btn-secondary flex items-center gap-1.5">
            <Map size={14} />
            {t('rutas.ver_mapa')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Asignar cobrador */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck size={16} className="text-brand-500" />
            <h2 className="text-sm font-bold text-gray-900">{t('rutas.cobrador_asignado')}</h2>
          </div>

          {ruta.cobrador ? (
            <div className="rounded-lg bg-brand-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-brand-800">
                {ruta.cobrador.nombre} {ruta.cobrador.apellido}
              </p>
              <p className="text-xs text-brand-600 mt-0.5">{t('rutas.cobrador_activo')}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{t('rutas.sin_cobrador')}</p>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('rutas.cambiar_cobrador')}
            </label>
            <select
              value={cobradorId}
              onChange={(e) => setCobradorId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">{t('rutas.seleccionar_placeholder')}</option>
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
              {asignarMut.isPending ? t('rutas.asignando') : t('rutas.asignar_cobrador')}
            </button>

            {asignarMut.isSuccess && (
              <p className="text-xs text-emerald-600 text-center">{t('rutas.asignado_exito')}</p>
            )}
          </div>
        </div>

        {/* Clientes en la ruta — orden de visita arrastrable */}
        <div className="card p-5 md:col-span-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-gray-900">
                {t('rutas.clientes_en_ruta')}
              </h2>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {t('rutas.clientes_count', { count: ordenLocal.length })}
              </span>
            </div>
            <button
              onClick={() => autoOrdenarMut.mutate()}
              disabled={autoOrdenarMut.isPending || ordenLocal.length < 2}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title={t('rutas.ordenar_cercania_tooltip')}
            >
              <Shuffle size={13} />
              {autoOrdenarMut.isPending ? t('rutas.ordenando') : t('rutas.ordenar_cercania')}
            </button>
          </div>
          <p className="text-xs text-gray-400 -mt-1">
            {t('rutas.arrastra_prefix')} <GripVertical size={11} className="inline -mt-0.5" /> {t('rutas.arrastra_suffix')}
          </p>

          {loadingClientes ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-11 rounded-lg" />)}
            </div>
          ) : ordenLocal.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">{t('rutas.sin_clientes')}</p>
              <p className="text-xs text-gray-300 mt-1">
                {t('rutas.sin_clientes_sub')}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ordenLocal.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-gray-50">
                  {ordenLocal.map((c, i) => (
                    <ClienteRutaRow
                      key={c.id}
                      cliente={c}
                      posicion={i + 1}
                      moviendo={moviendoId === c.id}
                      onIniciarMover={() => setMoviendoId(moviendoId === c.id ? null : c.id)}
                      rutaDestino={rutaDestinoPorCliente[c.id] ?? ''}
                      onCambiarRutaDestino={(v) =>
                        setRutaDestinoPorCliente((prev) => ({ ...prev, [c.id]: v }))}
                      otrasRutas={otrasRutas}
                      onConfirmarMover={() => {
                        const destino = rutaDestinoPorCliente[c.id];
                        if (destino) moverMut.mutate({ clienteId: c.id, rutaId: destino });
                      }}
                      moviendoPendiente={moverMut.isPending && moverMut.variables?.clienteId === c.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Historial de cambios de cobrador */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-gray-900">{t('rutas.historial_cobrador')}</h2>
        </div>
        <Table<HistorialCobradorRuta>
          columns={historialColumns}
          data={historial}
          keyField="id"
          loading={loadingHistorial}
          emptyMessage={t('rutas.sin_cambios_historial')}
          emptyIcon={<History size={32} className="text-gray-200" />}
        />
      </div>
    </div>
  );
}

interface ClienteRutaRowProps {
  cliente: Cliente;
  posicion: number;
  moviendo: boolean;
  onIniciarMover: () => void;
  rutaDestino: string;
  onCambiarRutaDestino: (v: string) => void;
  otrasRutas: { id: string; nombre: string }[];
  onConfirmarMover: () => void;
  moviendoPendiente: boolean;
}

function ClienteRutaRow({
  cliente, posicion, moviendo, onIniciarMover,
  rutaDestino, onCambiarRutaDestino, otrasRutas, onConfirmarMover, moviendoPendiente,
}: ClienteRutaRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cliente.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
            aria-label={t('rutas.aria_arrastrar_reordenar')}
          >
            <GripVertical size={16} />
          </button>
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
            {posicion}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {cliente.nombre} {cliente.apellido}
            </p>
            <p className="text-xs text-gray-400">{cliente.cedula ?? t('rutas.sin_cedula')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            label={cliente.activo ? t('common.activo') : t('common.inactivo')}
            variant={cliente.activo ? 'green' : 'gray'}
          />
          <Link
            to={`/clientes/${cliente.id}`}
            className="text-xs text-brand-600 hover:underline"
          >
            {t('common.ver')}
          </Link>
          <button
            onClick={onIniciarMover}
            title={t('rutas.mover_a_otra_ruta_tooltip')}
            className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <ArrowRightLeft size={14} />
          </button>
        </div>
      </div>

      {moviendo && (
        <div className="mt-2 ml-8 flex items-center gap-2">
          <select
            value={rutaDestino}
            onChange={(e) => onCambiarRutaDestino(e.target.value)}
            className="input-field text-xs py-1.5"
          >
            <option value="">{t('rutas.elegir_ruta_destino')}</option>
            {otrasRutas.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          <button
            onClick={onConfirmarMover}
            disabled={!rutaDestino || moviendoPendiente}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {moviendoPendiente ? t('rutas.moviendo') : t('rutas.mover')}
          </button>
        </div>
      )}
    </div>
  );
}
