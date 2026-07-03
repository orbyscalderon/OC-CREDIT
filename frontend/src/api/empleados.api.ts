import { api } from './axios';
import type { Empleado } from '@/types';

export const empleadosApi = {
  listar: () =>
    api.get<Empleado[]>('/usuarios').then((r) => r.data),

  crear: (dto: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol: string;
    cedula?: string;
    telefono?: string;
  }) => api.post<Empleado>('/usuarios', dto).then((r) => r.data),

  toggleActivo: (id: string, activo: boolean) =>
    api.patch(`/usuarios/${id}/activo`, { activo }).then((r) => r.data),

  resetPassword: (id: string, nueva_password: string) =>
    api.patch(`/usuarios/${id}/reset-password`, { nueva_password }).then((r) => r.data),
};
