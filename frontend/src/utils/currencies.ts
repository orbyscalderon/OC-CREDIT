export interface Moneda {
  codigo: string;
  simbolo: string;
  nombre: string;
}

/**
 * Lista curada de monedas reales (código ISO 4217 + símbolo de uso común).
 * No es exhaustiva a propósito -- prioriza LatAm (mercado principal) y las
 * monedas globales más usadas. "Otra" en el selector permite escribir
 * cualquier código/símbolo que no esté en esta lista.
 */
export const MONEDAS: Moneda[] = [
  { codigo: 'DOP', simbolo: 'RD$', nombre: 'Peso dominicano' },
  { codigo: 'USD', simbolo: '$', nombre: 'Dólar estadounidense' },
  { codigo: 'MXN', simbolo: '$', nombre: 'Peso mexicano' },
  { codigo: 'COP', simbolo: '$', nombre: 'Peso colombiano' },
  { codigo: 'VES', simbolo: 'Bs.', nombre: 'Bolívar venezolano' },
  { codigo: 'PAB', simbolo: 'B/.', nombre: 'Balboa panameño' },
  { codigo: 'PEN', simbolo: 'S/', nombre: 'Sol peruano' },
  { codigo: 'ARS', simbolo: '$', nombre: 'Peso argentino' },
  { codigo: 'CLP', simbolo: '$', nombre: 'Peso chileno' },
  { codigo: 'GTQ', simbolo: 'Q', nombre: 'Quetzal guatemalteco' },
  { codigo: 'HNL', simbolo: 'L', nombre: 'Lempira hondureño' },
  { codigo: 'NIO', simbolo: 'C$', nombre: 'Córdoba nicaragüense' },
  { codigo: 'CRC', simbolo: '₡', nombre: 'Colón costarricense' },
  { codigo: 'BOB', simbolo: 'Bs', nombre: 'Boliviano' },
  { codigo: 'PYG', simbolo: '₲', nombre: 'Guaraní paraguayo' },
  { codigo: 'UYU', simbolo: '$U', nombre: 'Peso uruguayo' },
  { codigo: 'BRL', simbolo: 'R$', nombre: 'Real brasileño' },
  { codigo: 'CUP', simbolo: '$', nombre: 'Peso cubano' },
  { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
  { codigo: 'GBP', simbolo: '£', nombre: 'Libra esterlina' },
  { codigo: 'CAD', simbolo: 'CA$', nombre: 'Dólar canadiense' },
];

export function buscarMoneda(codigo: string): Moneda | undefined {
  return MONEDAS.find((m) => m.codigo === codigo);
}
