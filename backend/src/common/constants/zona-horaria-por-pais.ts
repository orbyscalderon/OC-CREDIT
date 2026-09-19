import { ZONA_HORARIA_DEFAULT } from '../utils/fecha-negocio.util';

/**
 * Zona horaria por defecto al registrar un tenant nuevo, según su país.
 * Países con varios husos (EE.UU., Brasil) usan el más poblado/común como
 * default razonable — el admin del tenant puede cambiarlo después desde
 * Configuración (ver ZONAS_HORARIAS en zonas-horarias.ts para el selector).
 */
const POR_PAIS: Record<string, string> = {
  DO: 'America/Santo_Domingo',
  US: 'America/New_York',
  MX: 'America/Mexico_City',
  GT: 'America/Guatemala',
  HN: 'America/Tegucigalpa',
  SV: 'America/El_Salvador',
  NI: 'America/Managua',
  CR: 'America/Costa_Rica',
  PA: 'America/Panama',
  CO: 'America/Bogota',
  PE: 'America/Lima',
  EC: 'America/Guayaquil',
  VE: 'America/Caracas',
  CL: 'America/Santiago',
  AR: 'America/Argentina/Buenos_Aires',
  BR: 'America/Sao_Paulo',
  ES: 'Europe/Madrid',
};

export function zonaHorariaPorPais(paisIso2: string | null | undefined): string {
  if (!paisIso2) return ZONA_HORARIA_DEFAULT;
  return POR_PAIS[paisIso2.toUpperCase()] ?? ZONA_HORARIA_DEFAULT;
}
