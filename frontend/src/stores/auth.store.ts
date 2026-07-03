import type { JwtPayload } from '@/types';

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

const TOKEN_KEY = 'oc_token';

export const authStore = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser: (): JwtPayload | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      return decodeJwt(token);
    } catch {
      return null;
    }
  },

  isExpired: (): boolean => {
    const user = authStore.getUser();
    if (!user) return true;
    return user.exp * 1000 < Date.now();
  },

  isAuthenticated: (): boolean => !!authStore.getToken() && !authStore.isExpired(),
};
