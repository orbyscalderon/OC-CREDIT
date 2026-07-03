import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Map, PlusCircle, Eye, Power } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';
import { Table } from '@/components/common/Table';
import type { Ruta } from '@/types';

export function RutasPage() {
  const qc = useQueryClient();

  const { data: rutas, isLoading } = useQuery({
    queryKey: ['rutas', 'todas'],
    queryFn: () => rutasApi.listar(true),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) => rutasApi.toggleActiva(id, activa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rutas'] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rutas de Cobro</h1>
        <Link to="/rutas/nueva" className="btn-primary">
          <PlusCircle size={15} />
          Nueva ruta
        </Link>
      </div>

      <Table<Ruta>
        columns={[
          { key: 'nombre', header: 'Nombre' },
          { key: 'descripcion', header: 'Descripción', render: (r) => r.descripcion ?? '—' },
          {
            key: 'activa',
            header: 'Estado',
            render: (r) => (
              <span className={`text-xs font-medium ${r.activa ? 'text-emerald-600' : 'text-gray-400'}`}>
                {r.activa ? 'Activa' : 'Inactiva'}
              </span>
            ),
          },
          {
            key: 'acciones',
            header: '',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Link
                  to={`/rutas/${r.id}`}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 hover:underline"
                >
                  <Eye size={13} />
                  Detalle
                </Link>
                <Link
                  to={`/rutas/${r.id}/mapa`}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Map size={13} />
                  Mapa
                </Link>
                <button
                  onClick={() => toggleMut.mutate({ id: r.id, activa: !r.activa })}
                  disabled={toggleMut.isPending}
                  className={`flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-40 ${
                    r.activa ? 'text-red-500' : 'text-emerald-600'
                  }`}
                >
                  <Power size={13} />
                  {r.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ),
          },
        ]}
        data={rutas ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="Sin rutas registradas"
      />
    </div>
  );
}
