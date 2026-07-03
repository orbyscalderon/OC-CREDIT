import { api } from './axios';
import axios from 'axios';

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual_usd: number;
  precio_anual_usd: number;
  max_prestamos_activos: number;
  max_cobradores: number;
  max_rutas: number;
  permite_portal_cliente: boolean;
  permite_whatsapp_bot: boolean;
  permite_pagare_pdf: boolean;
  permite_mapa: boolean;
  permite_reportes_avanz: boolean;
}

export interface RegistrarTenantDto {
  nombre_empresa: string;
  email_admin: string;
  password: string;
  nombre_admin: string;
  apellido_admin: string;
  telefono?: string;
  ruc_cedula?: string;
  plan_id: string;
  facturacion_anual?: boolean;
}

export interface UsoPlan {
  tenant_id: string;
  nombre_empresa: string;
  plan_id: string;
  plan_nombre: string;
  max_prestamos_activos: number;
  max_cobradores: number;
  max_rutas: number;
  prestamos_activos_usados: number;
  cobradores_usados: number;
  rutas_usadas: number;
  pct_prestamos_usados: number;
  permite_mapa: boolean;
  permite_reportes_avanz: boolean;
  permite_pagare_pdf: boolean;
}

// Llamada pública sin JWT
const publicApi = axios.create({ baseURL: '/api/v1', timeout: 15_000 });

export const planesApi = {
  listar: () =>
    publicApi.get<Plan[]>('/planes').then((r) =>
      (r.data as unknown as { data: Plan[] }).data ?? r.data,
    ),

  registrar: (dto: RegistrarTenantDto) =>
    publicApi.post('/planes/registro', dto).then((r) =>
      (r.data as unknown as { data: unknown }).data ?? r.data,
    ),

  usoActual: () =>
    api.get<UsoPlan>('/reportes/uso-plan').then((r) => r.data),
};
