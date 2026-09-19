/**
 * Moneda por defecto al registrar un tenant nuevo, según su país (ISO 3166-1
 * alpha-2). Igual que documentos-identidad.ts: no pretende ser exhaustivo,
 * solo evita forzar DOP/RD$ a negocios fuera de República Dominicana. El
 * admin del tenant siempre puede cambiarlo después desde Configuración.
 */
export interface MonedaInfo {
  codigo: string;
  simbolo: string;
}

const POR_PAIS: Record<string, MonedaInfo> = {
  DO: { codigo: 'DOP', simbolo: 'RD$' },
  US: { codigo: 'USD', simbolo: '$' },
  MX: { codigo: 'MXN', simbolo: '$' },
  GT: { codigo: 'GTQ', simbolo: 'Q' },
  HN: { codigo: 'HNL', simbolo: 'L' },
  SV: { codigo: 'USD', simbolo: '$' },
  NI: { codigo: 'NIO', simbolo: 'C$' },
  CR: { codigo: 'CRC', simbolo: '₡' },
  PA: { codigo: 'USD', simbolo: '$' },
  CO: { codigo: 'COP', simbolo: '$' },
  PE: { codigo: 'PEN', simbolo: 'S/' },
  EC: { codigo: 'USD', simbolo: '$' },
  VE: { codigo: 'VES', simbolo: 'Bs' },
  CL: { codigo: 'CLP', simbolo: '$' },
  AR: { codigo: 'ARS', simbolo: '$' },
  BR: { codigo: 'BRL', simbolo: 'R$' },
  ES: { codigo: 'EUR', simbolo: '€' },
};

const GENERICO: MonedaInfo = { codigo: 'USD', simbolo: '$' };

export function monedaPorPais(paisIso2: string | null | undefined): MonedaInfo {
  if (!paisIso2) return POR_PAIS.DO;
  return POR_PAIS[paisIso2.toUpperCase()] ?? GENERICO;
}
