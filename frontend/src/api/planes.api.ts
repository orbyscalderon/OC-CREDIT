import { api } from './axios';
import axios from 'axios';
import type { LoginResponse } from './auth.api';

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
  pais?: string;
  plan_id: string;
  facturacion_anual?: boolean;
  stripePaymentMethodId: string;
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
  fecha_vencimiento_suscripcion: string | null;
}

export interface GooglePayRegistroDto extends RegistrarTenantDto {
  googlePayToken: string;
  monto_usd?: number;
}

export interface RegistroGoogleDto {
  credential: string;
  nombre_empresa: string;
  telefono?: string;
  ruc_cedula?: string;
  pais?: string;
  plan_id: string;
  stripePaymentMethodId: string;
}

export interface SuscribirPlanDto {
  plan_id: string;
  facturacion_anual?: boolean;
  googlePayToken?: string;
  paymentIntentId?: string;
}

// Llamada pública sin JWT
const publicApi = axios.create({ baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`, timeout: 15_000 });

export const planesApi = {
  listar: () =>
    publicApi.get<Plan[]>('/planes').then((r) =>
      (r.data as unknown as { data: Plan[] }).data ?? r.data,
    ),

  registrar: (dto: RegistrarTenantDto) =>
    publicApi.post('/planes/registro', dto).then((r) =>
      (r.data as unknown as { data: unknown }).data ?? r.data,
    ),

  crearSetupIntent: () =>
    publicApi.post<{ clientSecret: string }>('/planes/setup-intent').then((r) =>
      ((r.data as unknown as { data: { clientSecret: string } }).data ?? r.data) as { clientSecret: string },
    ),

  cancelarCobroAutomatico: () =>
    api.post<{ mensaje: string }>('/planes/cancelar-cobro-automatico').then((r) => r.data),

  registrarConGooglePay: (dto: GooglePayRegistroDto) =>
    publicApi.post('/planes/google-pay', dto).then((r) =>
      (r.data as unknown as { data: unknown }).data ?? r.data,
    ),

  // Devuelve un LoginResponse completo (igual que /auth/login) -- el
  // registro con Google deja al usuario autenticado de una vez, sin pedirle
  // que inicie sesión por separado después.
  registrarConGoogle: (dto: RegistroGoogleDto) =>
    publicApi.post('/planes/registro-google', dto).then((r) =>
      ((r.data as unknown as { data: LoginResponse }).data ?? r.data) as LoginResponse,
    ),

  usoActual: () =>
    api.get<UsoPlan>('/reportes/uso-plan').then((r) => r.data),

  suscribir: (dto: SuscribirPlanDto) =>
    api.post('/planes/suscribir', dto).then((r) => r.data),

  crearPaymentIntentPago: (plan_id: string, facturacion_anual: boolean) =>
    api.post<{ clientSecret: string }>('/planes/crear-payment-intent', { plan_id, facturacion_anual }).then((r) => r.data),
};
