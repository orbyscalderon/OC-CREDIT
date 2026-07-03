import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('oc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
    if (err.response?.status === 401) {
      localStorage.removeItem('oc_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
