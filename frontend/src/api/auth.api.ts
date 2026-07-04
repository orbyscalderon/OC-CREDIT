import { api } from './axios';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  usuario: {
    id: string;
    email: string;
    rol: string;
    nombre: string;
    apellido: string;
    empleado_id: string;
  };
  tenant_config: {
    tenant_id: string;
    nombre_empresa: string;
    url_logo: string | null;
    color_primario: string;
    color_secundario: string;
    color_acento: string;
    moneda: string;
    simbolo_moneda: string;
    zona_horaria: string;
    formato_fecha: string;
  };
}

export const authApi = {
  login: (dto: LoginDto) =>
    api.post<LoginResponse>('/auth/login', dto).then((r) => r.data),

  loginWithGoogle: (credential: string) =>
    api.post<LoginResponse>('/auth/google', { credential }).then((r) => r.data),

  me: () =>
    api.get<LoginResponse>('/auth/me').then((r) => r.data),

  logout: () =>
    api.post('/auth/logout').then((r) => r.data),
};
