import { api } from './axios';
import type { Cliente, PaginatedResponse } from '@/types';

export const clientesApi = {
  listar: (params: { page?: number; limit?: number; q?: string }) =>
    api.get<PaginatedResponse<Cliente>>('/clientes', { params }).then((r) => r.data),

  buscar: (q: string) =>
    api.get<Cliente[]>('/clientes/buscar', { params: { q } }).then((r) => r.data),

  obtener: (id: string) =>
    api.get<Cliente>(`/clientes/${id}`).then((r) => r.data),

  crear: (dto: Partial<Cliente>) =>
    api.post<Cliente>('/clientes', dto).then((r) => r.data),

  actualizar: (id: string, dto: Partial<Cliente>) =>
    api.put<Cliente>(`/clientes/${id}`, dto).then((r) => r.data),

  reasignarRuta: (id: string, rutaId: string) =>
    api.put(`/clientes/${id}/reasignar-ruta/${rutaId}`).then((r) => r.data),

  porRuta: (rutaId: string) =>
    api.get<Cliente[]>(`/clientes/ruta/${rutaId}`).then((r) => r.data),

  subirCedula: (id: string, frontal?: File | null, trasera?: File | null) => {
    const form = new FormData();
    if (frontal) form.append('frontal', frontal);
    if (trasera) form.append('trasera', trasera);
    return api.post<Cliente>(`/clientes/${id}/cedula`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  urlCedula: (id: string, lado: 'frontal' | 'trasera') =>
    `/api/v1/clientes/${id}/cedula/${lado}`,
};
