import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Eye } from 'lucide-react';
import { clientesApi } from '@/api/clientes.api';
import { Table } from '@/components/common/Table';
import { Badge } from '@/components/common/Badge';
import type { Cliente } from '@/types';

export function ClientesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', q, page],
    queryFn: () => clientesApi.listar({ page, limit: 20, q: q || undefined }),
    placeholderData: (prev) => prev,
  });

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    /* S1-6: animate-fade-in */
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{total} clientes registrados</p>
        </div>
        {/* S1-4: .btn-primary   S3-17: active:scale está incluido en .btn-primary */}
        <Link to="/clientes/nuevo" className="btn-primary">
          <UserPlus size={16} />
          Nuevo cliente
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, apellido o cédula…"
          /* S1-4: .input-field */
          className="input-field pl-9"
        />
      </div>

      <Table<Cliente>
        columns={[
          { key: 'cedula',   header: 'Cédula' },
          { key: 'nombre',   header: 'Nombre', render: (r) => `${r.nombre} ${r.apellido}` },
          { key: 'telefono', header: 'Teléfono', render: (r) => r.telefono ?? '—' },
          {
            key: 'activo',
            header: 'Estado',
            render: (r) => <Badge label={r.activo ? 'Activo' : 'Inactivo'} variant={r.activo ? 'green' : 'gray'} />,
          },
          {
            key: 'acciones',
            header: '',
            render: (r) => (
              <Link to={`/clientes/${r.id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors">
                <Eye size={13} />
                Ver
              </Link>
            ),
          },
        ]}
        data={data?.data ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No se encontraron clientes"
      />

      {/* S2-14: Página X de Y */}
      {total > 20 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500 text-xs">
            Página <span className="font-semibold text-gray-800">{page}</span> de <span className="font-semibold text-gray-800">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
