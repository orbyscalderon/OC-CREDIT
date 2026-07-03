import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { rutasApi } from '@/api/rutas.api';

const schema = z.object({
  nombre:      z.string().min(1, 'Requerido').max(100),
  descripcion: z.string().max(300).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function RutaNuevaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  const crear = useMutation({
    mutationFn: (dto: FormData) =>
      rutasApi.crear({ nombre: dto.nombre, descripcion: dto.descripcion || undefined }),
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
          Volver a rutas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva ruta de cobro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Crea una ruta para agrupar clientes y asignar cobradores</p>
      </div>

      <form
        onSubmit={handleSubmit((d) => crear.mutate(d))}
        className="card p-6 space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nombre de la ruta <span className="text-red-400">*</span>
          </label>
          <input
            {...register('nombre')}
            placeholder="Ruta Norte, Sector Los Mameyes…"
            className="input-field"
          />
          {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Descripción
          </label>
          <textarea
            {...register('descripcion')}
            rows={3}
            placeholder="Zona de cobertura, sectores incluidos, notas para el cobrador…"
            className="input-field resize-none"
          />
        </div>

        {crear.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {(crear.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Error al crear la ruta.'}
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
                Creando…
              </>
            ) : (
              <>
                <MapPin size={15} />
                Crear ruta
              </>
            )}
          </button>
          <Link to="/rutas" className="btn-secondary text-sm">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
