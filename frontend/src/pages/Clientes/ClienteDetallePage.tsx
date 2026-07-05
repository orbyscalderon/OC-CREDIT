import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, ScanLine, Upload, X as XIcon, CheckCircle2, FileDown } from 'lucide-react';
import { clientesApi } from '@/api/clientes.api';
import { prestamosApi } from '@/api/prestamos.api';
import { Table } from '@/components/common/Table';
import { Badge, estadoPrestamoVariant } from '@/components/common/Badge';
import { generarEstadoCuentaPDF } from '@/utils/estado-cuenta.pdf';
import { useAuth } from '@/hooks/useAuth';
import type { Prestamo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [frontalFile, setFrontalFile] = useState<File | null>(null);
  const [traseraFile, setTraseraFile] = useState<File | null>(null);
  const [frontalPreview, setFrontalPreview] = useState<string | null>(null);
  const [traseraPreview, setTraseraPreview] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState(false);
  const frontalRef = useRef<HTMLInputElement>(null);
  const traseraRef = useRef<HTMLInputElement>(null);

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

  const subirMut = useMutation({
    mutationFn: () => clientesApi.subirCedula(id!, frontalFile, traseraFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cliente', id] });
      setFrontalFile(null); setFrontalPreview(null);
      setTraseraFile(null); setTraseraPreview(null);
      setUploadOk(true);
      setTimeout(() => setUploadOk(false), 3000);
    },
  });

  const seleccionarFoto = (lado: 'frontal' | 'trasera', file: File) => {
    const url = URL.createObjectURL(file);
    if (lado === 'frontal') { setFrontalFile(file); setFrontalPreview(url); }
    else { setTraseraFile(file); setTraseraPreview(url); }
    setUploadOk(false);
  };

  const fmt = (n: number) =>
    'RD$ ' + n.toLocaleString('es-DO', { minimumFractionDigits: 2 });

  const hasPending = !!(frontalFile || traseraFile);

  return (
    <div className="p-6 space-y-6">
      <Link to="/clientes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Volver a clientes
      </Link>

      {cliente && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {cliente.nombre} {cliente.apellido}
            </h1>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600 lg:grid-cols-4">
              <div><span className="font-medium">Cédula:</span> {cliente.cedula ?? '—'}</div>
              <div><span className="font-medium">Teléfono:</span> {cliente.telefono ?? '—'}</div>
              <div><span className="font-medium">Dirección:</span> {cliente.direccion_casa ?? '—'}</div>
              <div>
                <span className="font-medium">Estado:</span>{' '}
                <span className={cliente.activo ? 'text-emerald-600' : 'text-red-500'}>
                  {cliente.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Fotos de cédula */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ScanLine size={13} />
              Cédula de identidad
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {(['frontal', 'trasera'] as const).map((lado) => {
                const savedUrl = lado === 'frontal' ? cliente.foto_cedula_frontal_url : cliente.foto_cedula_trasera_url;
                const preview = lado === 'frontal' ? frontalPreview : traseraPreview;
                const inputRef = lado === 'frontal' ? frontalRef : traseraRef;
                const displayUrl = preview ?? (savedUrl ? clientesApi.urlCedula(id!, lado) : null);

                return (
                  <div key={lado}>
                    <p className="text-xs text-gray-400 mb-1.5 capitalize flex items-center justify-between">
                      {lado}
                      {savedUrl && !preview && (
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="text-brand-600 hover:underline text-xs font-medium"
                        >
                          Reemplazar
                        </button>
                      )}
                    </p>
                    {displayUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-50">
                        <a href={displayUrl} target="_blank" rel="noreferrer">
                          <img
                            src={displayUrl}
                            alt={`Cédula ${lado}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                        {preview && (
                          <button
                            type="button"
                            onClick={() => {
                              if (lado === 'frontal') { setFrontalFile(null); setFrontalPreview(null); }
                              else { setTraseraFile(null); setTraseraPreview(null); }
                            }}
                            className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1 shadow text-gray-600 hover:text-red-600"
                          >
                            <XIcon size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-brand-600"
                      >
                        <Upload size={18} />
                        <span className="text-xs font-medium">Subir foto</span>
                      </button>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) seleccionarFoto(lado, f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Botón guardar / feedback */}
            {hasPending && (
              <button
                onClick={() => subirMut.mutate()}
                disabled={subirMut.isPending}
                className="mt-3 btn-primary text-sm"
              >
                {subirMut.isPending ? 'Guardando…' : 'Guardar fotos de cédula'}
              </button>
            )}
            {uploadOk && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 size={13} />
                Fotos guardadas correctamente
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link
              to={`/prestamos/nueva-solicitud?cliente_id=${id}`}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <CreditCard size={15} />
              Nuevo Préstamo
            </Link>
            <button
              onClick={() => {
                if (!cliente || !prestamos) return;
                generarEstadoCuentaPDF({
                  clienteNombre:    `${cliente.nombre} ${cliente.apellido}`,
                  clienteCedula:    cliente.cedula,
                  clienteTelefono:  cliente.telefono,
                  clienteDireccion: cliente.direccion_casa,
                  tenantNombre:     user?.tenant_nombre ?? 'OC HOLDING GROUP LLC',
                  prestamos:        prestamos.data,
                });
              }}
              className="btn-secondary text-sm"
            >
              <FileDown size={14} />
              Estado de cuenta
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Historial de Préstamos</h2>
        <Table<Prestamo>
          columns={[
            { key: 'capital_aprobado', header: 'Capital', render: (r) => fmt(r.capital_aprobado) },
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
