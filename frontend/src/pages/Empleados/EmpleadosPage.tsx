import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, UserCheck, UserX, KeyRound, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { empleadosApi } from '@/api/empleados.api';
import { Badge } from '@/components/common/Badge';
import type { Empleado } from '@/types';

const ROL_LABELS: Record<string, string> = {
  admin_tenant: 'Admin',
  supervisor_tenant: 'Supervisor',
  cobrador_tenant: 'Cobrador',
};

const schema = z.object({
  nombre:   z.string().min(1, 'Requerido').max(100),
  apellido: z.string().min(1, 'Requerido').max(100),
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol:      z.enum(['cobrador_tenant', 'supervisor_tenant', 'admin_tenant']),
  cedula:   z.string().max(20).optional().or(z.literal('')),
  telefono: z.string().max(30).optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export function EmpleadosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [resetTarget, setResetTarget] = useState<Empleado | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: empleadosApi.listar,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { rol: 'cobrador_tenant' },
  });

  const crearMut = useMutation({
    mutationFn: empleadosApi.crear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empleados'] });
      setShowModal(false);
      reset();
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      empleadosApi.toggleActivo(id, activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empleados'] }),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) =>
      empleadosApi.resetPassword(id, pwd),
    onSuccess: () => {
      setResetMsg('Contraseña actualizada');
      setTimeout(() => { setResetTarget(null); setResetMsg(''); setNewPassword(''); }, 1500);
    },
  });

  const crearErr = crearMut.isError
    ? ((crearMut.error as any)?.response?.data?.message ?? 'Error al crear empleado')
    : null;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500">Cobradores, supervisores y administradores</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusCircle size={15} />
          Nuevo empleado
        </button>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : empleados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCheck size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Sin empleados registrados</p>
          <p className="text-sm text-gray-400 mt-1">Crea el primer cobrador para empezar</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cédula</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rol</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.nombre} {emp.apellido}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.cedula ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={ROL_LABELS[emp.rol] ?? emp.rol}
                      variant={emp.rol === 'admin_tenant' ? 'purple' : emp.rol === 'supervisor_tenant' ? 'blue' : 'green'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={emp.activo ? 'Activo' : 'Inactivo'} variant={emp.activo ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleMut.mutate({ id: emp.id, activo: !emp.activo })}
                        title={emp.activo ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        {emp.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button
                        onClick={() => { setResetTarget(emp); setNewPassword(''); setResetMsg(''); }}
                        title="Resetear contraseña"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <KeyRound size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear empleado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-5 animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nuevo empleado</h2>
              <button onClick={() => { setShowModal(false); reset(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => crearMut.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre <span className="text-red-400">*</span></label>
                  <input {...register('nombre')} className="input-field" placeholder="Juan" />
                  {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Apellido <span className="text-red-400">*</span></label>
                  <input {...register('apellido')} className="input-field" placeholder="Pérez" />
                  {errors.apellido && <p className="mt-1 text-xs text-red-500">{errors.apellido.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email <span className="text-red-400">*</span></label>
                <input {...register('email')} type="email" className="input-field" placeholder="juan@empresa.com" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contraseña <span className="text-red-400">*</span></label>
                  <input {...register('password')} type="password" className="input-field" placeholder="Min. 8 caracteres" />
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rol <span className="text-red-400">*</span></label>
                  <select {...register('rol')} className="input-field">
                    <option value="cobrador_tenant">Cobrador</option>
                    <option value="supervisor_tenant">Supervisor</option>
                    <option value="admin_tenant">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cédula</label>
                  <input {...register('cedula')} className="input-field" placeholder="000-0000000-0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Teléfono</label>
                  <input {...register('telefono')} className="input-field" placeholder="809-000-0000" />
                </div>
              </div>

              {crearErr && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs text-red-700">{Array.isArray(crearErr) ? crearErr.join(', ') : crearErr}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={crearMut.isPending} className="btn-primary flex-1 justify-center">
                  {crearMut.isPending ? 'Creando…' : 'Crear empleado'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal resetear contraseña */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4 animate-fade-in overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-gray-900">
              Resetear contraseña
            </h2>
            <p className="text-sm text-gray-500">{resetTarget.nombre} {resetTarget.apellido} — {resetTarget.email}</p>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              className="input-field"
            />

            {resetMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs text-emerald-700">{resetMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => resetMut.mutate({ id: resetTarget.id, pwd: newPassword })}
                disabled={newPassword.length < 8 || resetMut.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {resetMut.isPending ? 'Actualizando…' : 'Actualizar'}
              </button>
              <button onClick={() => setResetTarget(null)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
