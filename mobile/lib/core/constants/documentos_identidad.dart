/// Debe coincidir con backend/src/common/constants/documentos-identidad.ts
class TipoDocumentoInfo {
  final String codigo;
  final String etiqueta;
  const TipoDocumentoInfo({required this.codigo, required this.etiqueta});
}

const Map<String, TipoDocumentoInfo> _porPais = {
  'DO': TipoDocumentoInfo(codigo: 'cedula', etiqueta: 'Cédula'),
  'US': TipoDocumentoInfo(codigo: 'ssn', etiqueta: 'SSN / ITIN'),
  'MX': TipoDocumentoInfo(codigo: 'curp', etiqueta: 'CURP'),
  'CO': TipoDocumentoInfo(codigo: 'cedula', etiqueta: 'Cédula de ciudadanía'),
  'VE': TipoDocumentoInfo(codigo: 'cedula', etiqueta: 'Cédula'),
  'PA': TipoDocumentoInfo(codigo: 'cedula', etiqueta: 'Cédula'),
  'PE': TipoDocumentoInfo(codigo: 'dni', etiqueta: 'DNI'),
  'AR': TipoDocumentoInfo(codigo: 'dni', etiqueta: 'DNI'),
  'CL': TipoDocumentoInfo(codigo: 'rut', etiqueta: 'RUT'),
  'EC': TipoDocumentoInfo(codigo: 'cedula', etiqueta: 'Cédula'),
  'ES': TipoDocumentoInfo(codigo: 'dni', etiqueta: 'DNI / NIE'),
};

const _generico = TipoDocumentoInfo(codigo: 'documento', etiqueta: 'Documento de identidad');

TipoDocumentoInfo tipoDocumentoPorPais(String? paisIso2) {
  if (paisIso2 == null) return _generico;
  return _porPais[paisIso2.toUpperCase()] ?? _generico;
}
