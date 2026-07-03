import { api } from './axios';
import type { DashboardData, AgingBand } from '@/types';

export interface MoraSresumen {
  total_prestamos_en_mora: number;
  mora_total_pendiente: number;
  max_dias_mora: number;
  detalle: Array<{
    prestamo_id: string;
    cliente_nombre: string;
    cliente_apellido: string;
    cedula: string | null;
    dias_mora: number;
    mora_pendiente: number;
  }>;
}

export interface CuentaCobrar {
  prestamo_id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cedula: string | null;
  telefono: string | null;
  ruta_nombre: string | null;
  cobrador_nombre: string | null;
  cuotas_pendientes: number;
  cuotas_vencidas: number;
  saldo_total: number;
  mora_pendiente: number;
  dias_mora: number;
  modalidad: string;
  fecha_ultimo_vencimiento: string | null;
}

export interface IngresoMensual {
  mes: string;
  total_cobrado: number;
  num_cobros: number;
}

export interface HistorialPago {
  id: string;
  fecha: string;
  monto_cobrado: number;
  distribucion: {
    mora_absorbida: number;
    interes_absorbido: number;
    capital_absorbido: number;
    excedente: number;
  };
  caja_id: string;
  cobrador_nombre: string;
}

export const reportesApi = {
  dashboard: () =>
    api.get<DashboardData>('/reportes/dashboard').then((r) => r.data),

  aging: () =>
    api.get<AgingBand[]>('/reportes/aging').then((r) => r.data),

  arqueosDia: (fecha?: string) =>
    api.get('/reportes/arqueos', { params: { fecha } }).then((r) => r.data),

  cobrosPorCobrador: (cobradorId: string, params: { desde: string; hasta: string }) =>
    api.get(`/reportes/cobrador/${cobradorId}`, { params }).then((r) => r.data),

  historialPrestamo: (prestamoId: string) =>
    api.get<HistorialPago[]>(`/reportes/prestamo/${prestamoId}/historial`).then((r) => r.data),

  moraSresumen: () =>
    api.get<MoraSresumen>('/reportes/mora/resumen').then((r) => r.data),

  cuentasCobrar: (soloVencidos = false) =>
    api.get<CuentaCobrar[]>('/reportes/cuentas-cobrar', {
      params: { solo_vencidos: soloVencidos },
    }).then((r) => r.data),

  notificaciones: () =>
    api.get<{ alertas: Array<{ tipo: string; titulo: string; mensaje: string; icono: string }>; total: number }>(
      '/reportes/notificaciones',
    ).then((r) => r.data),

  backup: () =>
    api.get<object>('/reportes/backup').then((r) => r.data),

  ingresosMensuales: () =>
    api.get<IngresoMensual[]>('/reportes/ingresos-mensuales').then((r) => r.data),

  usoPlan: () =>
    api.get('/reportes/uso-plan').then((r) => r.data),

  tenantSettings: () =>
    api.get('/tenants/settings').then((r) => r.data),
};
