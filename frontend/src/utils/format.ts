import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Config mínima necesaria para formatear moneda/fecha según el tenant.
 * Acepta tanto SessionUser (auth.store.ts: tenant_simbolo_moneda/tenant_formato_fecha)
 * como TenantSettings (useTenantSettings(): simbolo_moneda/formato_fecha) —
 * son las dos formas en que estos datos ya viajan por el frontend.
 */
export interface TenantFormatConfig {
  tenant_simbolo_moneda?: string | null;
  tenant_formato_fecha?: string | null;
  simbolo_moneda?: string | null;
  formato_fecha?: string | null;
}

// tenant_settings.formato_fecha guarda el patrón "humano" (DD/MM/YYYY);
// date-fns usa su propia sintaxis de tokens (dd/MM/yyyy).
const PATRONES_FECHA: Record<string, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

export function formatCurrency(
  monto: number | string | null | undefined,
  config?: TenantFormatConfig | null,
): string {
  const simbolo = config?.tenant_simbolo_moneda || config?.simbolo_moneda || 'RD$';
  const n = Number(monto ?? 0);
  return `${simbolo} ${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(
  fecha: string | Date | null | undefined,
  config?: TenantFormatConfig | null,
): string {
  if (!fecha) return '—';
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return '—';
  const patron = PATRONES_FECHA[config?.tenant_formato_fecha ?? config?.formato_fecha ?? ''] ?? 'dd/MM/yyyy';
  return formatDateFns(d, patron, { locale: es });
}
