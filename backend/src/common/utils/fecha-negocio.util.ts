const TZ_NEGOCIO = 'America/Santo_Domingo';

/**
 * Fecha de "hoy" en la zona horaria del negocio (RD), formato YYYY-MM-DD.
 *
 * NO usar `new Date().toISOString().split('T')[0]` para esto: toISOString
 * siempre devuelve la fecha en UTC, que se adelanta un día completo entre
 * las 8pm y la medianoche hora RD (RD = UTC-4). Una caja abierta, un cobro
 * registrado o un préstamo aprobado a las 9pm quedaría fechado "mañana".
 */
export function fechaHoyRD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_NEGOCIO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
