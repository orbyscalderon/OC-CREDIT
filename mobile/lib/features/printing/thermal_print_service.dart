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

    final lines = [
      ...PrintTextSize.size1(_center('================================')),
      ...PrintTextSize.size2(_center('OC Credit')),
      ...PrintTextSize.size1(_center('Recibo de Cobro')),
      ...PrintTextSize.size1(_center('================================')),
      ...PrintTextSize.size1('Fecha: $fechaStr'),
      ...PrintTextSize.size1('Cliente: $clienteNombre'),
      ...PrintTextSize.size1('Cedula:  ${prestamo.clienteCedula}'),
      ...PrintTextSize.size1('--------------------------------'),
      ...PrintTextSize.size1('Cuota:   RD\$ ${prestamo.cuotaMonto.toStringAsFixed(2)}'),
      if (prestamo.tieneMora && prestamo.montoMora > 0)
        ...PrintTextSize.size1('Mora:    RD\$ ${prestamo.montoMora.toStringAsFixed(2)}'),
      ...PrintTextSize.size1('--------------------------------'),
      ...PrintTextSize.size2('TOTAL:   RD\$ ${montoCobrado.toStringAsFixed(2)}'),
      ...PrintTextSize.size1('--------------------------------'),
      ...PrintTextSize.size1(syncedOnline ? 'Estado: SINCRONIZADO' : 'Estado: PENDIENTE DE SYNC'),
      ...PrintTextSize.size1('Ref: ${uuid.substring(0, 8).toUpperCase()}'),
      ...PrintTextSize.size1('================================'),
      ...PrintTextSize.size1(_center('© 2026 OC Moon Group LLC.')),
      ...PrintTextSize.size1(_center('Todos los derechos reservados.')),
      ...PrintTextSize.size1(''),
      ...PrintTextSize.size1(''),
      ...PrintTextSize.size1(''),
    ];

    await PrintBluetoothThermal.writeString(
      printText: PrintTextSize.reset() + lines.join(),
    );
  }

  String _center(String text, {int width = 32}) {
    if (text.length >= width) return text;
    final pad = (width - text.length) ~/ 2;
    return ' ' * pad + text;
  }
}
