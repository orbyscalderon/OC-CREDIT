import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../data/local/prestamos_cache_dao.dart';

/// Servicio de impresión ESC/POS por Bluetooth — impresoras de 58mm y 80mm
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
  }) async {
    final connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) return; // Sin impresora conectada, continúa silenciosamente

    final now = DateTime.now();
    final fechaStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}  '
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    // print_bluetooth_thermal 1.2.4: PrintTextSize es un dato simple
    // {size, text} — cada línea se envía con su propia llamada a
    // writeString (no hay forma de concatenar varios tamaños en un envío).
    final lines = <PrintTextSize>[
      PrintTextSize(size: 1, text: '${_center('================================')}\n'),
      PrintTextSize(size: 2, text: '${_center('OCA Credit')}\n'),
      PrintTextSize(size: 1, text: '${_center('Recibo de Cobro')}\n'),
      PrintTextSize(size: 1, text: '${_center('================================')}\n'),
      PrintTextSize(size: 1, text: 'Fecha: $fechaStr\n'),
      PrintTextSize(size: 1, text: 'Cliente: $clienteNombre\n'),
      PrintTextSize(size: 1, text: 'Cedula:  ${prestamo.clienteCedula}\n'),
      PrintTextSize(size: 1, text: '--------------------------------\n'),
      PrintTextSize(size: 1, text: 'Cuota:   RD\$ ${prestamo.cuotaMonto.toStringAsFixed(2)}\n'),
      if (prestamo.tieneMora && prestamo.montoMora > 0)
        PrintTextSize(size: 1, text: 'Mora:    RD\$ ${prestamo.montoMora.toStringAsFixed(2)}\n'),
      PrintTextSize(size: 1, text: '--------------------------------\n'),
      PrintTextSize(size: 2, text: 'TOTAL:   RD\$ ${montoCobrado.toStringAsFixed(2)}\n'),
      PrintTextSize(size: 1, text: '--------------------------------\n'),
      PrintTextSize(size: 1, text: '${syncedOnline ? 'Estado: SINCRONIZADO' : 'Estado: PENDIENTE DE SYNC'}\n'),
      PrintTextSize(size: 1, text: 'Ref: ${uuid.substring(0, 8).toUpperCase()}\n'),
      PrintTextSize(size: 1, text: '================================\n'),
      PrintTextSize(size: 1, text: '${_center('© 2026 OCA HOLDING GROUP LLC.')}\n'),
      PrintTextSize(size: 1, text: '${_center('Todos los derechos reservados.')}\n'),
      PrintTextSize(size: 1, text: '\n\n\n'),
    ];

    for (final line in lines) {
      await PrintBluetoothThermal.writeString(printText: line);
    }
  }

  String _center(String text, {int width = 32}) {
    if (text.length >= width) return text;
    final pad = (width - text.length) ~/ 2;
    return ' ' * pad + text;
  }
}
