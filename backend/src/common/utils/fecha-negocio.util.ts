export const ZONA_HORARIA_DEFAULT = 'America/Santo_Domingo';

/**
 * Fecha de "hoy" en la zona horaria de NEGOCIO DEL TENANT (no la del
 * servidor), formato YYYY-MM-DD.
 *
 * NO usar `new Date().toISOString().split('T')[0]` para esto: toISOString
 * siempre devuelve la fecha en UTC, que se adelanta un día completo respecto
 * a zonas horarias negativas (América) cerca de la medianoche local. Una
 * caja abierta, un cobro registrado o un préstamo aprobado a las 9pm hora
 * del tenant quedaría fechado "mañana".
 */
export function fechaHoyEnZona(tz: string): string {
  return fechaEnZona(tz, 0);
}

/** Igual que fechaHoyEnZona pero desplazada `offsetDias` días calendario. */
export function fechaEnZona(tz: string, offsetDias: number): string {
  const instante = new Date(Date.now() + offsetDias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Hora actual (0-23) en la zona horaria dada. */
export function horaActualEnZona(tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hora = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  return hora === 24 ? 0 : hora; // algunas ICU devuelven "24" para medianoche
}

const DIAS_SEMANA: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Día de la semana (0=domingo … 6=sábado, igual que Date#getDay) en la zona dada. */
export function diaSemanaEnZona(tz: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date());
  return DIAS_SEMANA[weekday] ?? new Date().getDay();
}

/** true solo si "hoy" (en la zona dada) es el último día calendario del mes. */
export function esUltimoDiaDelMesEnZona(tz: string): boolean {
  const [anio, mes, dia] = fechaHoyEnZona(tz).split('-').map(Number);
  const ultimoDiaDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return dia === ultimoDiaDelMes;
}
