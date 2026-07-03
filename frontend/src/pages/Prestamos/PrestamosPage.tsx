import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, PlusCircle } from 'lucide-react';
import { prestamosApi } from '@/api/prestamos.api';
import { Table } from '@/components/common/Table';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import type { EstadoPrestamo, Prestamo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS: EstadoPrestamo[] = ['Activo', 'Pendiente', 'Vencido', 'Pagado', 'Rechazado'];

export function PrestamosPage() {
  const [estado, setEstado] = useState<string>('');
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['prestamos', estado, page],
    queryFn: () => prestamosApi.listar({ page, limit: 20, estado: estado || undefined }),
    placeholderData: (prev) => prev,
  });

  const fmt = (n: number) =>
    'RD$ ' + Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    /* S1-6: animate-fade-in */
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-sm text-gray-500">{total} en total</p>
        </div>
        <Link to="/prestamos/nueva-solicitud" className="btn-primary">
          <PlusCircle size={15} />
          Nueva solicitud
        </Link>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setEstado(''); setPage(1); }}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all duration-150 ${
            !estado
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          Todos
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => { setEstado(e); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all duration-150 ${
              estado === e
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <Table<Prestamo>
        columns={[
          {
            key: 'cliente',
            header: 'Cliente',
            render: (r) =>
              r.cliente
                ? `${r.cliente.nombre} ${r.cliente.apellido}`
                : r.cliente_id,
          },
          {
            key: 'capital_aprobado',
            header: 'Capital',
            render: (r) => <span className="mono-nums">{fmt(r.capital_aprobado)}</span>,
          },
          { key: 'modalidad', header: 'Modalidad' },
          { key: 'num_cuotas', header: 'Cuotas' },
          {
            key: 'tasa_interes',
            header: 'Tasa',
            render: (r) => <span className="mono-nums">{r.tasa_interes}%</span>,
          },
          {
            key: 'fecha_aprobacion',
            header: 'Fecha',
            render: (r) =>
              r.fecha_aprobacion
                ? format(new Date(r.fecha_aprobacion), 'dd/MM/yyyy', { locale: es })
                : '—',
          },
          {
            key: 'estado',
            header: 'Estado',
            render: (r) => <Badge label={r.estado} variant={estadoPrestamoVariant(r.estado)} />,
          },
          {
            key: 'ver',
            header: '',
            render: (r) => (
              <Link
                to={`/prestamos/${r.id}`}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
              >
                <Eye size={13} />
                Ver
              </Link>
            ),
          },
        ]}
        data={data?.data ?? []}
        keyField="id"
        loading={isLoading}
        emptyMessage="No hay préstamos"
      />

      {/* S2-14: Página X de Y */}
      {total > 20 && (
        <div className="flex items-center justify-end gap-2">
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
