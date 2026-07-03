import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { reportesApi } from '@/api/reportes.api';
import type { TenantSettings } from '@/types';
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const schema = z.object({
  url_logo:         z.string().url('URL inválida').optional().or(z.literal('')),
  color_primario:   z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido'),
  color_secundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido'),
  moneda:           z.string().min(1, 'Requerido').max(3),
  simbolo_moneda:   z.string().min(1, 'Requerido').max(5),
  nombre_comercial: z.string().max(200).optional().or(z.literal('')),
  texto_pie_recibo: z.string().max(300).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function ConfigPage() {
  const qc = useQueryClient();

  const { data: settings } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: reportesApi.tenantSettings,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      url_logo: '', color_primario: '#3b82f6', color_secundario: '#1d4ed8',
      moneda: 'DOP', simbolo_moneda: 'RD$', nombre_comercial: '', texto_pie_recibo: '',
    },
  });

  useEffect(() => {
    if (settings) reset({
      url_logo:         settings.url_logo ?? '',
      color_primario:   settings.color_primario ?? '#3b82f6',
      color_secundario: settings.color_secundario ?? '#1d4ed8',
      moneda:           settings.moneda ?? 'DOP',
      simbolo_moneda:   settings.simbolo_moneda ?? 'RD$',
      nombre_comercial: settings.nombre_comercial ?? '',
      texto_pie_recibo: settings.texto_pie_recibo ?? '',
    });
  }, [settings, reset]);

  const saveMut = useMutation({
    mutationFn: (dto: FormData) => api.put('/tenants/settings', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant-settings'] }),
  });

  const errMsg = saveMut.isError
    ? ((saveMut.error as { response?: { data?: { message?: string } } })?.response?.data?.message
       ?? 'Error al guardar configuración')
    : null;

  return (
    <div className="p-6 space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">White-label: personaliza la apariencia de tu empresa</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => saveMut.mutate(d))}
        className="card p-6 space-y-5"
      >
        {/* Logo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">URL del logo</label>
          <input {...register('url_logo')} placeholder="https://tuempresa.com/logo.png" className="input-field" />
          {errors.url_logo && <p className="mt-1 text-xs text-red-500">{errors.url_logo.message}</p>}
        </div>

        {/* Nombre comercial */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre comercial</label>
          <input {...register('nombre_comercial')} placeholder="Mi Empresa de Préstamos S.R.L." className="input-field" />
        </div>

        {/* Colores */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Color primario</label>
            <div className="flex items-center gap-2">
              <input {...register('color_primario')} type="color" className="h-10 w-14 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
              <input {...register('color_primario')} placeholder="#3b82f6" className="input-field" />
            </div>
            {errors.color_primario && <p className="mt-1 text-xs text-red-500">{errors.color_primario.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Color secundario</label>
            <div className="flex items-center gap-2">
              <input {...register('color_secundario')} type="color" className="h-10 w-14 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
              <input {...register('color_secundario')} placeholder="#1d4ed8" className="input-field" />
            </div>
          </div>
        </div>

        {/* Moneda */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Código de moneda</label>
            <input {...register('moneda')} placeholder="DOP" className="input-field" maxLength={3} />
            {errors.moneda && <p className="mt-1 text-xs text-red-500">{errors.moneda.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Símbolo</label>
            <input {...register('simbolo_moneda')} placeholder="RD$" className="input-field" maxLength={5} />
            {errors.simbolo_moneda && <p className="mt-1 text-xs text-red-500">{errors.simbolo_moneda.message}</p>}
          </div>
        </div>

        {/* Pie de recibo */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pie de recibo</label>
          <textarea
            {...register('texto_pie_recibo')}
            rows={3}
            placeholder="Texto al pie de cada recibo de cobro…"
            className="input-field resize-none"
          />
        </div>

        {saveMut.isSuccess && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">Configuración guardada correctamente</p>
          </div>
        )}

        {errMsg && (
          <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errMsg}</p>
          </div>
        )}

        <button type="submit" disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
