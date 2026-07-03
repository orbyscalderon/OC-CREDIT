import { api } from './axios';
import type { CuotaAmortizacion, Prestamo, PaginatedResponse } from '@/types';

export interface ResumenSaldo {
  id: string;
  estado: string;
  capital_aprobado: number;
  saldo_cuotas: number;
  saldo_mora: number;
  cuotas_pendientes: number;
  cuotas_vencidas: number;
}

export const prestamosApi = {
  listar: (params: { page?: number; limit?: number; estado?: string; cliente_id?: string }) =>
    api.get<PaginatedResponse<Prestamo>>('/prestamos', { params }).then((r) => r.data),

  obtener: (id: string) =>
    api.get<Prestamo>(`/prestamos/${id}`).then((r) => r.data),

  cuotas: (id: string) =>
    api.get<{ prestamo: Prestamo; cuotas: CuotaAmortizacion[] }>(`/prestamos/${id}/cuotas`).then((r) => r.data),

  saldo: (id: string) =>
    api.get<ResumenSaldo>(`/prestamos/${id}/saldo`).then((r) => r.data),

  porRuta: (rutaId: string) =>
    api.get<Prestamo[]>(`/prestamos/ruta/${rutaId}`).then((r) => r.data),

  crearSolicitud: (dto: {
    cliente_id: string;
    ruta_id: string;
    capital_solicitado: number;
    numero_cuotas: number;
    modalidad: string;
    tasa_interes_propuesta?: number;
    notas?: string;
  }) => api.post<Prestamo>('/prestamos/solicitar', dto).then((r) => r.data),

  aprobar: (id: string, dto: {
    capital_aprobado: number;
    tasa_interes: number;
    cobrador_id: string;
    fecha_primer_pago: string;
    notas?: string;
  }) => api.post<Prestamo>(`/prestamos/${id}/aprobar`, dto).then((r) => r.data),

  rechazar: (id: string, dto: { motivo: string }) =>
    api.post(`/prestamos/${id}/rechazar`, dto).then((r) => r.data),

  renovar: (dto: {
    cliente_id: string;
    capital_aprobado: number;
    modalidad: string;
    numero_cuotas: number;
    tasa_interes: number;
    cobrador_id: string;
    fecha_primer_pago: string;
    notas?: string;
  }) => api.post('/prestamos/renovar', dto).then((r) => r.data),

  marcarVencido: (dto: { prestamo_id: string; motivo: string; reportar_buro: boolean }) =>
    api.post('/prestamos/marcar-vencido', dto).then((r) => r.data),
};
