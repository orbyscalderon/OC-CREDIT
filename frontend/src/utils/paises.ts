/** Países soportados al registrar una empresa nueva — define documento de
 * identidad, moneda y zona horaria por defecto (ver documentosIdentidad.ts,
 * backend/monedas-por-pais.ts y zonasHorarias.ts). */
export const PAISES: { codigo: string; nombre: string }[] = [
  { codigo: 'DO', nombre: 'República Dominicana' },
  { codigo: 'US', nombre: 'Estados Unidos' },
  { codigo: 'MX', nombre: 'México' },
  { codigo: 'GT', nombre: 'Guatemala' },
  { codigo: 'HN', nombre: 'Honduras' },
  { codigo: 'SV', nombre: 'El Salvador' },
  { codigo: 'NI', nombre: 'Nicaragua' },
  { codigo: 'CR', nombre: 'Costa Rica' },
  { codigo: 'PA', nombre: 'Panamá' },
  { codigo: 'CO', nombre: 'Colombia' },
  { codigo: 'PE', nombre: 'Perú' },
  { codigo: 'EC', nombre: 'Ecuador' },
  { codigo: 'VE', nombre: 'Venezuela' },
  { codigo: 'CL', nombre: 'Chile' },
  { codigo: 'AR', nombre: 'Argentina' },
  { codigo: 'BR', nombre: 'Brasil' },
  { codigo: 'ES', nombre: 'España' },
];
