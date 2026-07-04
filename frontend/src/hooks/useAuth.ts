import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { authStore, type SessionUser } from '@/stores/auth.store';
import type { LoginResponse } from '@/api/auth.api';

const JWT_DURATION_MS = 8 * 60 * 60 * 1000; // 8h — igual que JWT_EXPIRATION

function buildSession(resp: LoginResponse): SessionUser {
  return {
    id: resp.usuario.id,
    email: resp.usuario.email,
    rol: resp.usuario.rol,
    nombre: resp.usuario.nombre,
    apellido: resp.usuario.apellido,
    empleadoId: resp.usuario.empleado_id,
    tenantId: resp.tenant_config.tenant_id,
    tenant_nombre: resp.tenant_config.nombre_empresa,
    expiresAt: Date.now() + JWT_DURATION_MS,
  };
}

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(() => authStore.getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await authApi.login({ email, password });
      const session = buildSession(resp);
      authStore.setSession(session);
      setUser(session);
      return true;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Credenciales inválidas';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setLoading(true);
    setGoogleError(null);
    try {
      const resp = await authApi.loginWithGoogle(credential);
      const session = buildSession(resp);
      authStore.setSession(session);
      setUser(session);
      navigate('/panel', { replace: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Error al iniciar sesión con Google';
      setGoogleError(msg);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    authStore.clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return { user, loading, error, googleError, login, loginWithGoogle, logout, isAuthenticated: authStore.isAuthenticated() };
}
