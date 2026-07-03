import { api } from './axios';
import type { CobroResultado } from '@/types';

export const cobrosApi = {
  registrar: (dto: {
    uuid_idempotencia: string;
    prestamo_id: string;
    caja_id: string;
    monto_cobrado: number;
    descripcion?: string;
  }) => api.post<CobroResultado>('/cobros/registrar', dto).then((r) => r.data),

  listarPorCaja: (cajaId: string) =>
    api.get<CobroResultado[]>(`/cobros/caja/${cajaId}`).then((r) => r.data),
};
