import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../../core/theme.dart';
import '../../../l10n/app_localizations.dart';
import '../printer_prefs.dart';
import '../thermal_print_service.dart';

/// Emparejar/seleccionar la impresora térmica del dispositivo -- es una
/// preferencia POR COBRADOR (cada quien trae su propio equipo, y de marcas
/// distintas), no del tenant, por eso vive fuera de Configuración (que es
/// solo para admin) y queda accesible a cualquier rol desde el menú lateral.
class ImpresoraScreen extends StatefulWidget {
  const ImpresoraScreen({super.key});
  @override
  State<ImpresoraScreen> createState() => _ImpresoraScreenState();
}

class _ImpresoraScreenState extends State<ImpresoraScreen> {
  bool _buscando = false;
  bool _probando = false;
  List<BluetoothInfo> _dispositivos = [];
  String? _macGuardada;
  String? _nombreGuardado;
  int _ancho = 32;

  @override
  void initState() {
    super.initState();
    _cargarGuardado();
  }

  Future<void> _cargarGuardado() async {
    final mac = await PrinterPrefs.instance.obtenerMac();
    final nombre = await PrinterPrefs.instance.obtenerNombre();
    final ancho = await PrinterPrefs.instance.obtenerAncho();
    if (!mounted) return;
    setState(() {
      _macGuardada = mac;
      _nombreGuardado = nombre;
      _ancho = ancho;
    });
  }

  Future<void> _buscar() async {
    setState(() => _buscando = true);
    // Dispara el prompt nativo de permisos Bluetooth en Android 12+ si aún
    // no se han concedido -- sin esto pairedBluetooths siempre vuelve vacío.
    await PrintBluetoothThermal.isPermissionBluetoothGranted;
    final lista = await ThermalPrintService.instance.scanDevices();
    if (!mounted) return;
    setState(() {
      _dispositivos = lista;
      _buscando = false;
    });
  }

  Future<void> _conectar(BluetoothInfo d) async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _probando = true);
    final ok = await ThermalPrintService.instance.connect(d.macAdress);
    if (ok) {
      await PrinterPrefs.instance.guardarImpresora(mac: d.macAdress, nombre: d.name);
    }
    if (!mounted) return;
    setState(() {
      _probando = false;
      if (ok) {
        _macGuardada = d.macAdress;
        _nombreGuardado = d.name;
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? l10n.impresoraConectada : l10n.errorNoSePudoConectarImpresora)),
    );
  }

  Future<void> _olvidar() async {
    await PrinterPrefs.instance.olvidarImpresora();
    if (!mounted) return;
    setState(() {
      _macGuardada = null;
      _nombreGuardado = null;
    });
  }

  Future<void> _cambiarAncho(int cols) async {
    await PrinterPrefs.instance.guardarAncho(cols);
    if (!mounted) return;
    setState(() => _ancho = cols);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.impresoraTermica)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_macGuardada != null) ...[
            Card(
              color: AppTheme.success.withValues(alpha: 0.08),
              child: ListTile(
                leading: const Icon(Icons.print, color: AppTheme.success),
                title: Text(_nombreGuardado ?? _macGuardada!),
                subtitle: Text(l10n.impresoraGuardadaSubtitulo),
                trailing: TextButton(onPressed: _olvidar, child: Text(l10n.olvidar)),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Text(l10n.anchoDePapel, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ...PrinterPrefs.anchoOpciones.entries.map(
            (e) => RadioListTile<int>(
              value: e.key,
              groupValue: _ancho,
              onChanged: (v) => _cambiarAncho(v!),
              title: Text('${e.value} (${e.key} ${l10n.columnas})'),
              contentPadding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(height: 16),
          Text(l10n.dispositivosEmparejados, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(l10n.hintEmparejarImpresora,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _buscando ? null : _buscar,
            icon: _buscando
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.bluetooth_searching),
            label: Text(_buscando ? l10n.buscando : l10n.buscarImpresoras),
          ),
          const SizedBox(height: 8),
          if (_dispositivos.isEmpty && !_buscando)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(l10n.sinDispositivosBluetooth, style: TextStyle(color: Colors.grey.shade500)),
            )
          else
            ..._dispositivos.map((d) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.bluetooth),
                    title: Text(d.name.isEmpty ? d.macAdress : d.name),
                    subtitle: Text(d.macAdress),
                    trailing: d.macAdress == _macGuardada
                        ? const Icon(Icons.check_circle, color: AppTheme.success)
                        : null,
                    onTap: _probando ? null : () => _conectar(d),
                  ),
                )),
        ],
      ),
    );
  }
}
