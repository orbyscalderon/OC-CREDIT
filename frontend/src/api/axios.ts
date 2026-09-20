import axios, { AxiosError } from 'axios';
import i18n from '@/i18n/config';

// En dev, el proxy de vite.config.ts hace /api same-origin -> VITE_API_URL
// no hace falta. En producción, frontend (Cloudflare) y backend (Railway)
// viven en dominios distintos, así que se necesita la URL absoluta.
const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  // Cookie HttpOnly enviada automáticamente en cada request al mismo origen
  withCredentials: true,
});

// Manda el idioma activo en cada request -- así el backend puede responder
// en el mismo idioma para lo poco que arma texto del lado del servidor
// (ej. notificaciones), sin depender de que cada llamada lo agregue a mano.
api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language ?? 'es';
  return config;
});

// Auto-unwrap { success, data, timestamp } → data
// Global 401 → redirect to login
api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err: AxiosError) => {
    // Solo redirigir si no estamos ya en /login (evita reload que borra errores de auth)
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      authStore.clearSession();
      window.location.href = '/login';
    }
    // Prueba de 7 días vencida sin suscripción activa → pantalla para pagar.
    const code = (err.response?.data as { details?: { code?: string } } | undefined)?.details?.code;
    if (
      err.response?.status === 402 &&
      code === 'TRIAL_EXPIRED' &&
      window.location.pathname !== '/suscripcion-vencida'
    ) {
      window.location.href = '/suscripcion-vencida';
    }
    return Promise.reject(err);
  },
);

// Importación diferida para evitar circular dependency
import { authStore } from '@/stores/auth.store';
