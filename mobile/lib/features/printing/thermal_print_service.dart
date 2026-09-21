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

    // print_bluetooth_thermal 1.2.4: PrintTextSize es un dato simple
    // {size, text} — cada línea se envía con su propia llamada a
    // writeString (no hay forma de concatenar varios tamaños en un envío).
    // Tamaño 2 imprime a doble ancho (ESC/POS estándar) -- centrar con el
    // ancho completo de columnas se vería corrido a la derecha, por eso esas
    // líneas se centran contra la mitad de columnas.
    final lines = <PrintTextSize>[
      PrintTextSize(size: 1, text: '$linea\n'),
      PrintTextSize(size: 2, text: '${_center(tenantNombre, ancho ~/ 2)}\n'),
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
      PrintTextSize(size: 2, text: '${_padLeft('TOTAL:', montoCobrado, simboloMoneda, ancho ~/ 2)}\n'),
      PrintTextSize(size: 1, text: '$lineaFina\n'),
      PrintTextSize(size: 1, text: '${syncedOnline ? 'Estado: SINCRONIZADO' : 'Estado: PENDIENTE DE SYNC'}\n'),
      PrintTextSize(size: 1, text: 'Ref: ${uuid.substring(0, 8).toUpperCase()}\n'),
      PrintTextSize(size: 1, text: '$linea\n'),
      PrintTextSize(
        size: 1,
        text: '${_center(textoPieRecibo?.trim().isNotEmpty == true ? textoPieRecibo!.trim() : '© ${now.year} $tenantNombre. Todos los derechos reservados.', ancho)}\n',
      ),
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

  String _padLeft(String label, double monto, String simbolo, int width) {
    final valor = '$simbolo ${monto.toStringAsFixed(2)}';
    final texto = '$label $valor';
    return texto.length >= width ? texto : '$label${' ' * (width - label.length - valor.length)}$valor';
  }
}
