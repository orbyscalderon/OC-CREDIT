import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle2, LocateFixed } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';
import { empleadosApi } from '@/api/empleados.api';

const schema = z.object({
  nombre:      z.string().min(1, 'Requerido').max(100),
  descripcion: z.string().max(300).optional().or(z.literal('')),
  direccion:   z.string().max(255).optional().or(z.literal('')),
  cobrador_id: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function RutaNuevaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '', direccion: '', cobrador_id: '' },
  });

  const { data: cobradores = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: empleadosApi.listar,
    select: (data) => data.filter((e) => e.activo && e.rol === 'cobrador_tenant'),
  });

  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionError, setUbicacionError] = useState('');
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      setUbicacionError(t('rutas.ubicacion_sin_soporte'));
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
        setUbicacionError(t('rutas.ubicacion_error'));
        setBuscandoUbicacion(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const crear = useMutation({
    mutationFn: (dto: FormData) =>
      rutasApi.crear({
        nombre: dto.nombre,
        descripcion: dto.descripcion || undefined,
        direccion: dto.direccion || undefined,
        cobrador_id: dto.cobrador_id || undefined,
        latitud: ubicacion?.lat,
        longitud: ubicacion?.lng,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rutas'] });
      navigate('/rutas');
    },
  });

  return (
    <div className="p-6 max-w-lg space-y-6 animate-fade-in">
      <div>
        <Link to="/rutas" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
          <ArrowLeft size={15} />
          {t('rutas.volver')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('rutas.nueva_titulo')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('rutas.nueva_subtitulo')}</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => crear.mutate(d))}
        className="card p-6 space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('rutas.nombre_ruta')} <span className="text-red-400">*</span>
          </label>
          <input
            {...register('nombre')}
            placeholder={t('rutas.nombre_ruta_placeholder')}
            className="input-field"
          />
          {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('rutas.descripcion')}
          </label>
          <textarea
            {...register('descripcion')}
            rows={3}
            placeholder={t('rutas.descripcion_placeholder')}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('rutas.direccion')}
          </label>
          <input
            {...register('direccion')}
            placeholder={t('rutas.direccion_placeholder')}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('rutas.ubicacion')}
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={capturarUbicacion}
              disabled={buscandoUbicacion}
              className="btn-secondary text-sm flex-shrink-0"
            >
              <LocateFixed size={14} />
              {buscandoUbicacion ? t('rutas.buscando_ubicacion') : ubicacion ? t('rutas.actualizar_ubicacion') : t('rutas.usar_ubicacion_actual')}
            </button>
            {ubicacion && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                {t('rutas.ubicacion_capturada', { lat: ubicacion.lat.toFixed(5), lng: ubicacion.lng.toFixed(5) })}
              </span>
            )}
          </div>
          {ubicacionError && <p className="mt-1 text-xs text-red-500">{ubicacionError}</p>}
          <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={11} />
            {t('rutas.ubicacion_hint')}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {t('rutas.cobrador_asignado')}
          </label>
          <select {...register('cobrador_id')} className="input-field">
            <option value="">{t('rutas.sin_asignar_opcion')}</option>
            {cobradores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido}
              </option>
            ))}
          </select>
        </div>

        {crear.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {(crear.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? t('rutas.error_crear')}
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
                {t('rutas.creando')}
              </>
            ) : (
              <>
                <MapPin size={15} />
                {t('rutas.crear')}
              </>
            )}
          </button>
          <Link to="/rutas" className="btn-secondary text-sm">
            {t('common.cancelar')}
          </Link>
        </div>
      </form>
    </div>
  );
}
