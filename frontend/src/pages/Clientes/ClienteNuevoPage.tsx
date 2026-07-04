import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, MapPin, CheckCircle2, LocateFixed, Upload, X as XIcon } from 'lucide-react';
import { clientesApi } from '@/api/clientes.api';
import { rutasApi } from '@/api/rutas.api';

const schema = z.object({
  cedula:    z.string().min(9, 'Mínimo 9 caracteres').max(20),
  nombre:    z.string().min(1, 'Requerido').max(80),
  apellido:  z.string().min(1, 'Requerido').max(80),
  telefono:  z.string().max(20).optional().or(z.literal('')),
  direccion: z.string().max(300).optional().or(z.literal('')),
  ruta_id:   z.string().uuid('Selecciona una ruta válida').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function ClienteNuevoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionError, setUbicacionError] = useState('');
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  // Fotos de cédula
  const [frontalFile, setFrontalFile] = useState<File | null>(null);
  const [traseraFile, setTraseraFile] = useState<File | null>(null);
  const [frontalPreview, setFrontalPreview] = useState<string | null>(null);
  const [traseraPreview, setTraseraPreview] = useState<string | null>(null);
  const frontalRef = useRef<HTMLInputElement>(null);
  const traseraRef = useRef<HTMLInputElement>(null);

  const seleccionarFoto = (lado: 'frontal' | 'trasera', file: File) => {
    const url = URL.createObjectURL(file);
    if (lado === 'frontal') { setFrontalFile(file); setFrontalPreview(url); }
    else { setTraseraFile(file); setTraseraPreview(url); }
  };

  const quitarFoto = (lado: 'frontal' | 'trasera') => {
    if (lado === 'frontal') { setFrontalFile(null); setFrontalPreview(null); }
    else { setTraseraFile(null); setTraseraPreview(null); }
  };

  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      setUbicacionError('Tu navegador no soporta geolocalización');
      return;
    }
    setBuscandoUbicacion(true);
    setUbicacionError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBuscandoUbicacion(false);
      },
      () => {
        setUbicacionError('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
        setBuscandoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => rutasApi.listar(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cedula: '', nombre: '', apellido: '', telefono: '', direccion: '', ruta_id: '' },
  });

  const crear = useMutation({
    mutationFn: async (dto: FormData) => {
      const cliente = await clientesApi.crear({
        cedula:         dto.cedula,
        nombre:         dto.nombre,
        apellido:       dto.apellido,
        telefono:       dto.telefono || undefined,
        direccion_casa: dto.direccion || undefined,
        ruta_id:        dto.ruta_id   || undefined,
        latitud_casa:   ubicacion?.lat,
        longitud_casa:  ubicacion?.lng,
      });
      if (frontalFile || traseraFile) {
        await clientesApi.subirCedula(cliente.id, frontalFile, traseraFile);
      }
      return cliente;
    },
    onSuccess: (cliente) => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      navigate(`/clientes/${cliente.id}`);
    },
  });

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <div>
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft size={15} />
          Volver a clientes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo cliente</h1>
        <p className="text-sm text-gray-500 mt-0.5">Completa los datos del cliente</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => crear.mutate(d))}
        className="card p-6 space-y-5"
      >
        {/* Cédula */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Cédula <span className="text-red-400">*</span>
          </label>
          <input
            {...register('cedula')}
            placeholder="001-1234567-8"
            className="input-field"
          />
          {errors.cedula && <p className="mt-1 text-xs text-red-500">{errors.cedula.message}</p>}
        </div>

        {/* Fotos de cédula */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Foto de cédula <span className="text-gray-400 normal-case font-normal">(opcional)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['frontal', 'trasera'] as const).map((lado) => {
              const preview = lado === 'frontal' ? frontalPreview : traseraPreview;
              const inputRef = lado === 'frontal' ? frontalRef : traseraRef;
              return (
                <div key={lado}>
                  <p className="text-xs text-gray-400 mb-1 capitalize">{lado}</p>
                  {preview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-50">
                      <img src={preview} alt={`Cédula ${lado}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => quitarFoto(lado)}
                        className="absolute top-1.5 right-1.5 rounded-full bg-white/90 p-1 shadow text-gray-600 hover:text-red-600"
                      >
                        <XIcon size={12} />
                      </button>
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
        </div>

        {/* Nombre y apellido */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input {...register('nombre')} placeholder="Juan" className="input-field" />
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Apellido <span className="text-red-400">*</span>
            </label>
            <input {...register('apellido')} placeholder="Pérez" className="input-field" />
            {errors.apellido && <p className="mt-1 text-xs text-red-500">{errors.apellido.message}</p>}
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Teléfono
          </label>
          <input
            {...register('telefono')}
            placeholder="809-555-1234"
            className="input-field"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Dirección
          </label>
          <textarea
            {...register('direccion')}
            rows={2}
            placeholder="Calle, sector, municipio…"
            className="input-field resize-none"
          />
        </div>

        {/* Ubicación GPS — es donde se entrega y cobra el préstamo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Ubicación de la casa
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={capturarUbicacion}
              disabled={buscandoUbicacion}
              className="btn-secondary text-sm flex-shrink-0"
            >
              <LocateFixed size={14} />
              {buscandoUbicacion ? 'Buscando…' : ubicacion ? 'Actualizar ubicación' : 'Usar mi ubicación actual'}
            </button>
            {ubicacion && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                Ubicación capturada ({ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)})
              </span>
            )}
          </div>
          {ubicacionError && <p className="mt-1 text-xs text-red-500">{ubicacionError}</p>}
          <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={11} />
            Captúrala estando en la casa del cliente — aparecerá en el mapa de la ruta donde se entregó/cobra el préstamo
          </p>
        </div>

        {/* Ruta */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Ruta de cobro
          </label>
          <select {...register('ruta_id')} className="input-field">
            <option value="">Sin asignar</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Error del servidor */}
        {crear.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {(crear.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Error al crear el cliente. Verifica los datos e intenta de nuevo.'}
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
                Guardando…
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Crear cliente
              </>
            )}
          </button>
          <Link to="/clientes" className="btn-secondary text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
