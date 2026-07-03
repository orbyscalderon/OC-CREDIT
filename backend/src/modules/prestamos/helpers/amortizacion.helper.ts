/**
 * Genera el plan de amortización para un préstamo.
 * Modalidad: cuota fija (francés simplificado).
 * El interés se aplica sobre el capital total (no decreciente) para
 * modalidades de corto plazo, que es el modelo estándar de las financieras de ruta.
 */
export interface CuotaPlan {
  numero_cuota: number;
  fecha_vencimiento: Date;
  capital: number;
  interes: number;
  monto_total: number;
}

export function calcularPlanAmortizacion(
  capitalAprobado: number,
  tasaInteres: number,   // Tasa total en porcentaje (no por período), ej: 20 = 20%
  numeroCuotas: number,
  fechasVencimiento: Date[],
): CuotaPlan[] {
  // Interés total sobre el capital
  const totalInteres  = Math.round(capitalAprobado * (tasaInteres / 100) * 100) / 100;
  const totalAPagar   = capitalAprobado + totalInteres;

  // Cuota base (división equitativa)
  const cuotaBase     = Math.floor((totalAPagar / numeroCuotas) * 100) / 100;
  const capitalBase   = Math.floor((capitalAprobado / numeroCuotas) * 100) / 100;
  const interesBase   = Math.floor((totalInteres / numeroCuotas) * 100) / 100;

  const plan: CuotaPlan[] = [];
  let capitalAcum = 0;
  let interesAcum = 0;

  for (let i = 1; i <= numeroCuotas; i++) {
    const esUltima = i === numeroCuotas;

    // La última cuota absorbe el redondeo residual
    const capital = esUltima
      ? Math.round((capitalAprobado - capitalAcum) * 100) / 100
      : capitalBase;

    const interes = esUltima
      ? Math.round((totalInteres - interesAcum) * 100) / 100
      : interesBase;

    capitalAcum += capital;
    interesAcum += interes;

    plan.push({
      numero_cuota: i,
      fecha_vencimiento: fechasVencimiento[i - 1],
      capital,
      interes,
      monto_total: Math.round((capital + interes) * 100) / 100,
    });
  }

  return plan;
}
