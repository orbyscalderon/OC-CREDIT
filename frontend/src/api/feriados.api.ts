import { api } from './axios';
import type { Feriado } from '@/types';

export const feriadosApi = {
  listar: () =>
    api.get<Feriado[]>('/tenants/feriados').then((r) => r.data),

  crear: (dto: { fecha: string; descripcion?: string }) =>
    api.post<Feriado>('/tenants/feriados', dto).then((r) => r.data),

  eliminar: (fecha: string) =>
    api.delete(`/tenants/feriados/${fecha}`).then((r) => r.data),
};
