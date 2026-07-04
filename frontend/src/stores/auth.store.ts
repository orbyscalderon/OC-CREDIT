// El JWT vive en una cookie HttpOnly gestionada por el servidor.
// El frontend NO tiene acceso al token — solo almacena la información
// de usuario necesaria para la UI en sessionStorage.

export interface SessionUser {
  id: string;
  email: string;
  rol: string;
  nombre: string;
  apellido: string;
  empleadoId: string;
  tenantId: string;
  tenant_nombre: string;
  expiresAt: number; // epoch ms
}

const SESSION_KEY = 'oc_session';

export const authStore = {
  setSession: (user: SessionUser): void => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  getUser: (): SessionUser | null => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  },

  clearSession: (): void => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated: (): boolean => {
    const user = authStore.getUser();
    if (!user) return false;
    return user.expiresAt > Date.now();
  },
};
