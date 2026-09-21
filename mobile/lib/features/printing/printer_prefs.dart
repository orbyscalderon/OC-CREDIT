import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Preferencias de la impresora térmica emparejada -- son por DISPOSITIVO
/// (cada cobrador puede traer una marca/ancho de impresora distinto), no por
/// tenant, así que se guardan localmente y nunca se sincronizan al backend.
class PrinterPrefs {
  PrinterPrefs._internal();
  static final PrinterPrefs instance = PrinterPrefs._internal();

  static const _storage = FlutterSecureStorage();
  static const _kMac = 'printer_mac';
  static const _kName = 'printer_name';
  static const _kAncho = 'printer_ancho_cols';

  /// 32 columnas ~ papel de 58mm, 48 columnas ~ papel de 80mm (Font A ESC/POS
  /// estándar). Es la única forma de adaptar el recibo a distintos modelos de
  /// impresora ya que el paquete de Bluetooth no expone el ancho del papel.
  static const anchoOpciones = {32: '58mm', 48: '80mm'};

  Future<void> guardarImpresora({required String mac, required String nombre}) async {
    await _storage.write(key: _kMac, value: mac);
    await _storage.write(key: _kName, value: nombre);
  }

  Future<void> olvidarImpresora() async {
    await _storage.delete(key: _kMac);
    await _storage.delete(key: _kName);
  }

  Future<void> guardarAncho(int columnas) =>
      _storage.write(key: _kAncho, value: columnas.toString());

  Future<String?> obtenerMac() => _storage.read(key: _kMac);
  Future<String?> obtenerNombre() => _storage.read(key: _kName);

  Future<int> obtenerAncho() async {
    final raw = await _storage.read(key: _kAncho);
    final parsed = raw != null ? int.tryParse(raw) : null;
    return anchoOpciones.containsKey(parsed) ? parsed! : 32;
  }
}
