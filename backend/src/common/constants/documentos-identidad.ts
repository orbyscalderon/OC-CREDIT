/**
 * Tipo de documento de identidad esperado por país (ISO 3166-1 alpha-2).
 * No es una lista exhaustiva de países ni de reglas legales — es solo la
 * etiqueta que se le muestra al usuario en vez de "Cédula" fijo, y el
 * `codigo` que queda guardado en `clientes.tipo_documento`/`empleados.tipo_documento`
 * para desambiguar el buró de crédito cross-tenant entre países.
 */
export interface TipoDocumentoInfo {
  codigo: string;
  etiqueta: string;
}

const POR_PAIS: Record<string, TipoDocumentoInfo> = {
  DO: { codigo: 'cedula', etiqueta: 'Cédula' },
  US: { codigo: 'ssn', etiqueta: 'SSN / ITIN' },
  MX: { codigo: 'curp', etiqueta: 'CURP' },
  CO: { codigo: 'cedula', etiqueta: 'Cédula de ciudadanía' },
  VE: { codigo: 'cedula', etiqueta: 'Cédula' },
  PA: { codigo: 'cedula', etiqueta: 'Cédula' },
  PE: { codigo: 'dni', etiqueta: 'DNI' },
  AR: { codigo: 'dni', etiqueta: 'DNI' },
  CL: { codigo: 'rut', etiqueta: 'RUT' },
  EC: { codigo: 'cedula', etiqueta: 'Cédula' },
  ES: { codigo: 'dni', etiqueta: 'DNI / NIE' },
};

const GENERICO: TipoDocumentoInfo = { codigo: 'documento', etiqueta: 'Documento de identidad' };

export function tipoDocumentoPorPais(paisIso2: string | null | undefined): TipoDocumentoInfo {
  if (!paisIso2) return GENERICO;
  return POR_PAIS[paisIso2.toUpperCase()] ?? GENERICO;
}
