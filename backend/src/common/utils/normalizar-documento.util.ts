/**
 * Normaliza un número de documento de identidad (cédula, DNI, RUT, CURP…)
 * para guardarlo y compararlo de forma consistente: quita espacios, guiones,
 * puntos y cualquier otro separador, y pasa a mayúsculas (hay documentos,
 * como CURP o RUT, que usan letras). Sin esto, "001-1234567-8" y
 * "0011234567 8" son la misma persona pero nunca hacen match -- y eso rompe
 * justo lo que el buró cross-tenant necesita garantizar.
 */
export function normalizarDocumento(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
