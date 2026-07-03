import { api } from './axios';
import type { Caja, ArqueoCaja } from '@/types';

export const cajasApi = {
  abrir: (dto: { ruta_id: string; monto_apertura: number; latitud?: number; longitud?: number }) =>
    api.post<Caja>('/cajas/abrir', dto).then((r) => r.data),

  // El backend usa POST /cajas/cerrar con caja_id en el body
  cerrar: (cajaId: string, dto: { monto_cierre_declarado: number }) =>
    api.post('/cajas/cerrar', { caja_id: cajaId, ...dto }).then((r) => r.data),

  obtenerArqueo: (id: string) =>
    api.get<ArqueoCaja>(`/cajas/${id}/arqueo`).then((r) => r.data),

  // El endpoint real es /cajas/dia (no /cajas/hoy). Solo admin/supervisor:
  // ve todas las cajas del tenant, no solo las propias.
  listarDelDia: (fecha?: string) =>
    api.get<Caja[]>('/cajas/dia', { params: fecha ? { fecha } : undefined }).then((r) => r.data),

  // Cajas activas del cobrador autenticado (puede tener varias, una por ruta).
  // Es lo que debe usar un cobrador — /cajas/dia le está vedado.
  misCajasActivas: () =>
    api.get<Caja[]>('/cajas/activa').then((r) => r.data),

  registrarGasto: (dto: { uuid_idempotencia: string; caja_id: string; monto: number; descripcion: string }) =>
    api.post('/cajas/gastos', dto).then((r) => r.data),
};
