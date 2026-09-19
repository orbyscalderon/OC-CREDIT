/**
 * Espejo de `backend/src/common/constants/documentos-identidad.ts` — misma
 * idea, sin capa de configuración por tenant todavía: solo cambia la
 * ETIQUETA que ve el usuario según el país del tenant, para que el sistema
 * deje de asumir "Cédula" (RD) en toda la interfaz.
 */
export interface TipoDocumentoInfo {
  codigo: string;
  etiqueta: string;
  placeholder: string;
}

const POR_PAIS: Record<string, TipoDocumentoInfo> = {
  DO: { codigo: 'cedula', etiqueta: 'Cédula', placeholder: '001-1234567-8' },
  US: { codigo: 'ssn', etiqueta: 'SSN / ITIN', placeholder: '123-45-6789' },
  MX: { codigo: 'curp', etiqueta: 'CURP', placeholder: 'AAAA000101HAAAAA00' },
  CO: { codigo: 'cedula', etiqueta: 'Cédula de ciudadanía', placeholder: '1234567890' },
  VE: { codigo: 'cedula', etiqueta: 'Cédula', placeholder: 'V-12345678' },
  PA: { codigo: 'cedula', etiqueta: 'Cédula', placeholder: '8-123-4567' },
  PE: { codigo: 'dni', etiqueta: 'DNI', placeholder: '12345678' },
  AR: { codigo: 'dni', etiqueta: 'DNI', placeholder: '12.345.678' },
  CL: { codigo: 'rut', etiqueta: 'RUT', placeholder: '12.345.678-9' },
  EC: { codigo: 'cedula', etiqueta: 'Cédula', placeholder: '1234567890' },
  ES: { codigo: 'dni', etiqueta: 'DNI / NIE', placeholder: '12345678A' },
};

const GENERICO: TipoDocumentoInfo = {
  codigo: 'documento', etiqueta: 'Documento de identidad', placeholder: '',
};

export function tipoDocumentoPorPais(paisIso2: string | null | undefined): TipoDocumentoInfo {
  if (!paisIso2) return GENERICO;
  return POR_PAIS[paisIso2.toUpperCase()] ?? GENERICO;
}
