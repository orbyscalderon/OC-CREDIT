import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { authStore } from '@/stores/auth.store';
import type { JwtPayload } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<JwtPayload | null>(() => authStore.getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await authApi.login({ email, password });
      authStore.setToken(resp.access_token);
      setUser(authStore.getUser());
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
    // Revocar el refresh token en el servidor. Si falla (red caída, token ya
    // expirado), no bloquea el logout local — el usuario igual debe poder salir.
    authApi.logout().catch(() => {});
    authStore.removeToken();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return { user, loading, error, login, logout, isAuthenticated: authStore.isAuthenticated() };
}
