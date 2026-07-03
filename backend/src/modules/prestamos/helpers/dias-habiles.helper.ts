import { EntityManager } from 'typeorm';

/**
 * Retorna TRUE si la fecha es laborable para el tenant dado.
 * Excluye: domingos + feriados globales + feriados propios del tenant.
 */
export async function esDiaHabil(
  fecha: Date,
  tenantId: string,
  em: EntityManager,
): Promise<boolean> {
  // getUTCDay (no getDay): las fechas se construyen como medianoche UTC a
  // partir de strings "YYYY-MM-DD"; con TZ del servidor detrás de UTC
  // (ej. America/Santo_Domingo) getDay() local lee el día calendario anterior.
  if (fecha.getUTCDay() === 0) return false; // Domingo

  const fechaStr = fecha.toISOString().split('T')[0];
  const count = await em.query<{ cnt: string }[]>(
    `SELECT COUNT(*) AS cnt FROM feriados
     WHERE fecha = $1 AND (tenant_id IS NULL OR tenant_id = $2)`,
    [fechaStr, tenantId],
  );
  return parseInt(count[0].cnt, 10) === 0;
}

/**
 * Desplaza la fecha al siguiente día hábil si cae en domingo o feriado.
 */
export async function siguienteDiaHabil(
  fecha: Date,
  tenantId: string,
  em: EntityManager,
): Promise<Date> {
  let cursor = new Date(fecha);
  while (!(await esDiaHabil(cursor, tenantId, em))) {
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return cursor;
}

/**
 * Genera N fechas de vencimiento consecutivas según la modalidad,
 * desplazando cada fecha al siguiente día hábil si es necesario.
 */
export async function generarFechasVencimiento(
  fechaInicio: Date,
  modalidad: 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual',
  numeroCuotas: number,
  tenantId: string,
  em: EntityManager,
): Promise<Date[]> {
  const diasPorModalidad: Record<string, number | null> = {
    Diario:    1,
    Semanal:   7,
    Quincenal: 15,
    Mensual:   null,  // Usa addMonth()
  };

  const fechas: Date[] = [];

  if (modalidad === 'Mensual') {
    // Ancla al día original del mes (ej. 31) en vez de encadenar setMonth(),
    // que desborda en meses cortos (31 ene + 1 mes → 3 mar, no 28/29 feb) y
    // arrastra ese desborde acumulándolo en cada cuota siguiente.
    // Getters/setters UTC (no locales): fechaInicio es medianoche UTC y con
    // TZ del servidor detrás de UTC, getDate()/setDate() locales leen/escriben
    // el día calendario anterior.
    const diaAnclaje = fechaInicio.getUTCDate();

    for (let i = 0; i < numeroCuotas; i++) {
      const base = new Date(Date.UTC(fechaInicio.getUTCFullYear(), fechaInicio.getUTCMonth() + i, 1));
      const ultimoDiaDelMes = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
      base.setUTCDate(Math.min(diaAnclaje, ultimoDiaDelMes));
      fechas.push(await siguienteDiaHabil(base, tenantId, em));
    }

    return fechas;
  }

  let cursor = new Date(fechaInicio);
  const dias = diasPorModalidad[modalidad] as number;

  for (let i = 0; i < numeroCuotas; i++) {
    cursor = await siguienteDiaHabil(cursor, tenantId, em);
    fechas.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + dias * 86_400_000);
  }

  return fechas;
}
