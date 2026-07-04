import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { authStore, type SessionUser } from '@/stores/auth.store';

const JWT_DURATION_MS = 8 * 60 * 60 * 1000; // 8h — igual que JWT_EXPIRATION

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(() => authStore.getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { usuario, tenant_config } = await authApi.login({ email, password });

      const session: SessionUser = {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        empleadoId: usuario.empleado_id,
        tenantId: tenant_config.tenant_id,
        tenant_nombre: tenant_config.nombre_empresa,
        expiresAt: Date.now() + JWT_DURATION_MS,
      };

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

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    authStore.clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return { user, loading, error, login, logout, isAuthenticated: authStore.isAuthenticated() };
}
