import { api } from './axios';
import type { Ruta, CoordenadasRuta, HistorialCobradorRuta } from '@/types';

export const rutasApi = {
  listar: (incluirInactivas = false) =>
    api.get<Ruta[]>('/rutas', { params: incluirInactivas ? { incluir_inactivas: 'true' } : undefined }).then((r) => r.data),

  toggleActiva: (id: string, activa: boolean) =>
    api.patch<Ruta>(`/rutas/${id}/activa`, { activa }).then((r) => r.data),

  obtener: (id: string) =>
    api.get<Ruta>(`/rutas/${id}`).then((r) => r.data),

  misRutas: () =>
    api.get<Ruta[]>('/rutas/mis-rutas').then((r) => r.data),

  crear: (dto: {
    nombre: string; descripcion?: string; cobrador_id?: string;
    direccion?: string; latitud?: number; longitud?: number;
  }) =>
    api.post<Ruta>('/rutas', dto).then((r) => r.data),

  coordenadas: (id: string, fecha?: string) =>
    api.get<CoordenadasRuta>('/rutas/mapa/gps', { params: { fecha, ruta_id: id } }).then((r) => r.data),

  asignarCobrador: (rutaId: string, cobradorId: string) =>
    api.put(`/rutas/${rutaId}/asignar-cobrador/${cobradorId}`).then((r) => r.data),

  historialCobrador: (rutaId: string) =>
    api.get<HistorialCobradorRuta[]>(`/rutas/${rutaId}/historial-cobrador`).then((r) => r.data),
};
