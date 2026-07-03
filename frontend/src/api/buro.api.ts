import { api } from './axios';
import type { PerfilBuro, HistorialCredito, PaginatedResponse } from '@/types';

export const buroApi = {
  consultar: (dto: { cedula: string; monto_prestamo_planificado?: number }) =>
    api.post<PerfilBuro>('/buro/consultar', dto).then((r) => r.data),

  reportar: (dto: {
    cedula: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    nivel_riesgo: string;
    motivo: string;
    descripcion_detallada?: string;
    capital_original: number;
    saldo_impagado: number;
    dias_mora?: number;
    prestamo_id?: string;
  }) => api.post<HistorialCredito>('/buro/reportar', dto).then((r) => r.data),

  marcarSaldada: (dto: { reporte_id: string; fecha_saldo: string; comprobante_url?: string }) =>
    api.post('/buro/marcar-saldada', dto).then((r) => r.data),

  misReportes: (params: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<HistorialCredito>>('/buro/mis-reportes', { params }).then((r) => r.data),

  estadisticas: () =>
    api.get('/buro/estadisticas').then((r) => r.data),
};
