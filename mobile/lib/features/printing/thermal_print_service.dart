import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../data/local/prestamos_cache_dao.dart';
import 'printer_prefs.dart';

/// Servicio de impresión ESC/POS por Bluetooth. El ancho real (58mm/80mm y
/// las distintas marcas que cada cobrador puede traer) se lee de
/// [PrinterPrefs] -- el paquete de bajo nivel no expone el papel del modelo
/// conectado, así que el usuario lo declara una vez en Configuración.
class ThermalPrintService {
  ThermalPrintService._internal();
  static final ThermalPrintService instance = ThermalPrintService._internal();

  Future<List<BluetoothInfo>> scanDevices() async {
    final connected = await PrintBluetoothThermal.pairedBluetooths;
    return connected;
  }

  Future<bool> connect(String macAddress) async {
    return PrintBluetoothThermal.connect(macPrinterAddress: macAddress);
  }

  Future<void> printRecibo({
    required String clienteNombre,
    required PrestamoCache prestamo,
    required double montoCobrado,
    required String uuid,
    required bool syncedOnline,
    required String tenantNombre,
    String? textoPieRecibo,
    String simboloMoneda = 'RD\$',
  }) async {
    var connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) {
      // No hay conexión activa (Bluetooth se desconecta solo entre cobros) --
      // reintenta con la última impresora guardada antes de rendirse.
      final macGuardada = await PrinterPrefs.instance.obtenerMac();
      if (macGuardada == null) return;
      connected = await PrintBluetoothThermal.connect(macPrinterAddress: macGuardada);
      if (!connected) return;
    }

    final ancho = await PrinterPrefs.instance.obtenerAncho();
    final linea = '=' * ancho;
    final lineaFina = '-' * ancho;

    final now = DateTime.now();
    final fechaStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}  '
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final pieTexto = textoPieRecibo?.trim().isNotEmpty == true
        ? textoPieRecibo!.trim()
        : '© ${now.year} $tenantNombre. Todos los derechos reservados.';

    // print_bluetooth_thermal 1.2.4: PrintTextSize es un dato simple
    // {size, text} — cada línea se envía con su propia llamada a
    // writeString (no hay forma de concatenar varios tamaños en un envío).
    //
    // "size" NO es un factor de escala lineal (el doc del paquete dice "50%
    // a 400%" pero eso es engañoso) -- son índices a comandos ESC/POS reales
    // (ver PrintBluetoothThermalPlugin.kt, setBytes.size):
    //   1 -> ESC M 1  = fuente B (condensada, caben MÁS columnas que la
    //        fuente A, no menos)
    //   2 -> ESC M 0  = fuente A normal = exactamente el ancho base
    //        (32 cols/58mm, 48 cols/80mm) contra el que se centra todo
    //   3-5 -> GS ! con doble/triple/cuádruple ancho -- no se usan aquí.
    // O sea: tamaño 1 y 2 usan el mismo `ancho` de columnas sin ajustar --
    // solo tamaño 3+ necesitaría dividir el ancho, y este recibo no los usa.
    //
    // El nombre del tenant y el pie de recibo son de longitud LIBRE (el
    // admin los escribe en Configuración) -- a diferencia de las etiquetas
    // fijas de más abajo, van con _wrapCentered para partirse en varias
    // líneas en vez de cortarse a la mitad de una palabra.
    final lines = <PrintTextSize>[
      PrintTextSize(size: 1, text: '$linea\n'),
      for (final l in _wrapCentered(tenantNombre, ancho)) PrintTextSize(size: 2, text: '$l\n'),
      PrintTextSize(size: 1, text: '${_center('Recibo de Cobro', ancho)}\n'),
      PrintTextSize(size: 1, text: '$linea\n'),
      PrintTextSize(size: 1, text: 'Fecha: $fechaStr\n'),
      PrintTextSize(size: 1, text: 'Cliente: $clienteNombre\n'),
      PrintTextSize(size: 1, text: 'Cedula:  ${prestamo.clienteCedula}\n'),
      PrintTextSize(size: 1, text: '$lineaFina\n'),
      PrintTextSize(size: 1, text: 'Cuota:   $simboloMoneda ${prestamo.cuotaMonto.toStringAsFixed(2)}\n'),
      if (prestamo.tieneMora && prestamo.montoMora > 0)
        PrintTextSize(size: 1, text: 'Mora:    $simboloMoneda ${prestamo.montoMora.toStringAsFixed(2)}\n'),
      PrintTextSize(size: 1, text: '$lineaFina\n'),
      PrintTextSize(size: 2, text: '${_padLeft('TOTAL:', montoCobrado, simboloMoneda, ancho)}\n'),
      PrintTextSize(size: 1, text: '$lineaFina\n'),
      PrintTextSize(size: 1, text: '${syncedOnline ? 'Estado: SINCRONIZADO' : 'Estado: PENDIENTE DE SYNC'}\n'),
      PrintTextSize(size: 1, text: 'Ref: ${uuid.substring(0, 8).toUpperCase()}\n'),
      PrintTextSize(size: 1, text: '$linea\n'),
      for (final l in _wrapCentered(pieTexto, ancho)) PrintTextSize(size: 1, text: '$l\n'),
      PrintTextSize(size: 1, text: '\n\n\n'),
    ];

    for (final line in lines) {
      await PrintBluetoothThermal.writeString(printText: line);
    }
  }

  String _center(String text, int width) {
    if (text.length >= width) return text.substring(0, width);
    final pad = (width - text.length) ~/ 2;
    return ' ' * pad + text;
  }

  /// Como [_center] pero para texto de longitud libre (nombre del tenant,
  /// pie de recibo configurable) -- parte por palabras en vez de cortar a
  /// la mitad, para que un nombre de empresa largo no se trunque ilegible.
  List<String> _wrapCentered(String text, int width) {
    final palabras = text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
    final renglones = <String>[];
    var actual = '';
    for (final palabra in palabras) {
      final candidato = actual.isEmpty ? palabra : '$actual $palabra';
      if (candidato.length <= width) {
        actual = candidato;
      } else {
        if (actual.isNotEmpty) renglones.add(actual);
        // Palabra suelta más larga que el papel (raro, pero posible) --
        // se corta, no queda otra opción en una impresora de una sola fuente.
        actual = palabra.length > width ? palabra.substring(0, width) : palabra;
      }
    }
    if (actual.isNotEmpty) renglones.add(actual);
    if (renglones.isEmpty) renglones.add('');
    return renglones.map((r) => _center(r, width)).toList();
  }

  String _padLeft(String label, double monto, String simbolo, int width) {
    final valor = '$simbolo ${monto.toStringAsFixed(2)}';
    final texto = '$label $valor';
    return texto.length >= width ? texto : '$label${' ' * (width - label.length - valor.length)}$valor';
  }
}
