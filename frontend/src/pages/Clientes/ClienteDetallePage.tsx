import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, IdCard } from 'lucide-react';
import { clientesApi } from '@/api/clientes.api';
import { prestamosApi } from '@/api/prestamos.api';
import { Table } from '@/components/common/Table';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import type { Prestamo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();

  const { data: cliente } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.obtener(id!),
    enabled: !!id,
  });

  const { data: prestamos, isLoading } = useQuery({
    queryKey: ['prestamos-cliente', id],
    queryFn: () => prestamosApi.listar({ cliente_id: id, limit: 50 }),
    enabled: !!id,
  });

  const fmt = (n: number) =>
    'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <Link to="/clientes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      {cliente && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            {cliente.nombre} {cliente.apellido}
          </h1>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600 lg:grid-cols-4">
            <div><span className="font-medium">Cédula:</span> {cliente.cedula}</div>
            <div><span className="font-medium">Teléfono:</span> {cliente.telefono ?? '—'}</div>
            <div><span className="font-medium">Dirección:</span> {cliente.direccion_casa ?? '—'}</div>
            <div>
              <span className="font-medium">Estado:</span>{' '}
              <span className={cliente.activo ? 'text-emerald-600' : 'text-red-500'}>
                {cliente.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          {/* Fotos de cédula */}
          {(cliente.foto_cedula_frontal_url || cliente.foto_cedula_trasera_url) && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <IdCard size={13} />
                Cédula de identidad
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {(['frontal', 'trasera'] as const).map((lado) => {
                  const hasPhoto = lado === 'frontal' ? !!cliente.foto_cedula_frontal_url : !!cliente.foto_cedula_trasera_url;
                  if (!hasPhoto) return null;
                  return (
                    <div key={lado}>
                      <p className="text-xs text-gray-400 mb-1 capitalize">{lado}</p>
                      <a
                        href={clientesApi.urlCedula(id!, lado)}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-50 hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={clientesApi.urlCedula(id!, lado)}
                          alt={`Cédula ${lado}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Link
              to={`/prestamos/nueva-solicitud?cliente_id=${id}`}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <CreditCard size={15} />
              Nuevo Préstamo
            </Link>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Historial de Préstamos</h2>
        <Table<Prestamo>
          columns={[
            {
              key: 'capital_aprobado',
              header: 'Capital',
              render: (r) => fmt(r.capital_aprobado),
            },
            { key: 'modalidad', header: 'Modalidad' },
            { key: 'num_cuotas', header: 'Cuotas' },
            {
              key: 'fecha_aprobacion',
              header: 'Aprobación',
              render: (r) =>
                r.fecha_aprobacion
                  ? format(new Date(r.fecha_aprobacion), 'dd MMM yyyy', { locale: es })
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
                <Link to={`/prestamos/${r.id}`} className="text-xs text-brand-600 hover:underline">
                  Ver
                </Link>
              ),
            },
          ]}
          data={prestamos?.data ?? []}
          keyField="id"
          loading={isLoading}
          emptyMessage="Sin préstamos"
        />
      </div>
    </div>
  );
}
