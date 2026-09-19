/// Espejo de frontend/src/utils/paises.ts — países soportados al registrar
/// una empresa nueva (define documento de identidad, moneda y zona horaria
/// por defecto, ver backend/src/common/constants/*-por-pais.ts).
class PaisInfo {
  final String codigo;
  final String nombre;
  const PaisInfo(this.codigo, this.nombre);
}

const List<PaisInfo> paises = [
  PaisInfo('DO', 'República Dominicana'),
  PaisInfo('US', 'Estados Unidos'),
  PaisInfo('MX', 'México'),
  PaisInfo('GT', 'Guatemala'),
  PaisInfo('HN', 'Honduras'),
  PaisInfo('SV', 'El Salvador'),
  PaisInfo('NI', 'Nicaragua'),
  PaisInfo('CR', 'Costa Rica'),
  PaisInfo('PA', 'Panamá'),
  PaisInfo('CO', 'Colombia'),
  PaisInfo('PE', 'Perú'),
  PaisInfo('EC', 'Ecuador'),
  PaisInfo('VE', 'Venezuela'),
  PaisInfo('CL', 'Chile'),
  PaisInfo('AR', 'Argentina'),
  PaisInfo('BR', 'Brasil'),
  PaisInfo('ES', 'España'),
];
