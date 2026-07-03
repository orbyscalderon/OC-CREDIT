import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesApi } from '@/api/reportes.api';
import type { TenantSettings } from '@/types';

export function useTenantSettings() {
  const { data } = useQuery<TenantSettings>({
    queryKey: ['tenant-settings'],
    queryFn: reportesApi.tenantSettings,
    staleTime: 5 * 60 * 1000,
  });

  // Aplica CSS vars para white-label dinámico
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    if (data.color_primario) {
      root.style.setProperty('--brand-500', data.color_primario);
      root.style.setProperty('--brand-600', darken(data.color_primario, 10));
      root.style.setProperty('--brand-700', darken(data.color_primario, 20));
    }
  }, [data]);

  return data;
}

function darken(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(2.55 * pct));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(2.55 * pct));
  const b = Math.max(0, (n & 0xff) - Math.round(2.55 * pct));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
