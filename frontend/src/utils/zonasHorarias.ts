/** Espejo de backend/src/common/constants/zonas-horarias.ts */
export interface ZonaHoraria {
  valor: string;
  etiqueta: string;
}

export const ZONAS_HORARIAS: ZonaHoraria[] = [
  { valor: 'America/Santo_Domingo', etiqueta: 'Rep. Dominicana (GMT-4)' },
  { valor: 'America/New_York', etiqueta: 'Este de EE.UU. (GMT-5/-4)' },
  { valor: 'America/Chicago', etiqueta: 'Centro de EE.UU. (GMT-6/-5)' },
  { valor: 'America/Denver', etiqueta: 'Montaña de EE.UU. (GMT-7/-6)' },
  { valor: 'America/Los_Angeles', etiqueta: 'Pacífico de EE.UU. (GMT-8/-7)' },
  { valor: 'America/Mexico_City', etiqueta: 'México (GMT-6)' },
  { valor: 'America/Guatemala', etiqueta: 'Guatemala (GMT-6)' },
  { valor: 'America/Tegucigalpa', etiqueta: 'Honduras (GMT-6)' },
  { valor: 'America/El_Salvador', etiqueta: 'El Salvador (GMT-6)' },
  { valor: 'America/Managua', etiqueta: 'Nicaragua (GMT-6)' },
  { valor: 'America/Costa_Rica', etiqueta: 'Costa Rica (GMT-6)' },
  { valor: 'America/Panama', etiqueta: 'Panamá (GMT-5)' },
  { valor: 'America/Bogota', etiqueta: 'Colombia (GMT-5)' },
  { valor: 'America/Lima', etiqueta: 'Perú (GMT-5)' },
  { valor: 'America/Guayaquil', etiqueta: 'Ecuador (GMT-5)' },
  { valor: 'America/Caracas', etiqueta: 'Venezuela (GMT-4)' },
  { valor: 'America/Santiago', etiqueta: 'Chile (GMT-4/-3)' },
  { valor: 'America/Argentina/Buenos_Aires', etiqueta: 'Argentina (GMT-3)' },
  { valor: 'America/Sao_Paulo', etiqueta: 'Brasil (GMT-3)' },
  { valor: 'Europe/Madrid', etiqueta: 'España (GMT+1/+2)' },
];

export const FORMATOS_FECHA: { valor: string; etiqueta: string }[] = [
  { valor: 'DD/MM/YYYY', etiqueta: '31/12/2026 (DD/MM/AAAA)' },
  { valor: 'MM/DD/YYYY', etiqueta: '12/31/2026 (MM/DD/AAAA)' },
  { valor: 'YYYY-MM-DD', etiqueta: '2026-12-31 (AAAA-MM-DD)' },
];
