import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/local/sync_queue_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../data/services/sync_service.dart';
import '../../../core/theme.dart';
import '../../cajas/providers/caja_provider.dart';
import '../../printing/thermal_print_service.dart';

class RegistrarCobroScreen extends ConsumerStatefulWidget {
  final String prestamoId;
  const RegistrarCobroScreen({super.key, required this.prestamoId});

  @override
  ConsumerState<RegistrarCobroScreen> createState() =>
      _RegistrarCobroScreenState();
}

class _RegistrarCobroScreenState extends ConsumerState<RegistrarCobroScreen> {
  final _montoCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  PrestamoCache? _prestamo;

  @override
  void initState() {
    super.initState();
    _loadPrestamo();
  }

  @override
  void dispose() {
    _montoCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadPrestamo() async {
    final p = await PrestamoCacheDao().getById(widget.prestamoId);
    if (mounted) {
      setState(() => _prestamo = p);
      if (p != null) {
        final totalPendiente = p.cuotaMonto + (p.tieneMora ? p.montoMora : 0);
        _montoCtrl.text = totalPendiente.toStringAsFixed(2);
      }
    }
  }

  Future<Position?> _getLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _registrarCobro() async {
    final monto = double.tryParse(_montoCtrl.text.trim());
    if (monto == null || monto <= 0) {
      setState(() => _error = 'Ingresa un monto válido');
      return;
    }

    final cajaId = ref.read(cajaActivaProvider)?.id;
    if (cajaId == null) {
      setState(() => _error = 'Debes abrir una caja primero');
      return;
    }

    setState(() { _loading = true; _error = null; });

    final uuid = const Uuid().v4();
    final pos = await _getLocation();

    final payload = {
      'uuid_idempotencia': uuid,
      'prestamo_id': widget.prestamoId,
      'monto_cobrado': monto,
      'caja_id': cajaId,
      if (pos != null) 'lat': pos.latitude,
      if (pos != null) 'lng': pos.longitude,
    };

    bool syncedOnline = false;

    try {
      await ApiClient.instance.dio.post('/cobros/registrar', data: payload);
      syncedOnline = true;
    } catch (_) {
      // Sin red: encolar para sync posterior
      await SyncQueueDao().enqueue(uuid, '/cobros/registrar', payload);
    }

    if (!mounted) return;

    // Imprimir recibo por Bluetooth
    await ThermalPrintService.instance.printRecibo(
      clienteNombre: _prestamo?.clienteNombre ?? '',
      prestamo: _prestamo!,
      montoCobrado: monto,
      uuid: uuid,
      syncedOnline: syncedOnline,
    );

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(syncedOnline
          ? 'Cobro registrado correctamente'
          : 'Sin red — cobro guardado y se enviará automáticamente'),
      backgroundColor: syncedOnline ? AppTheme.success : AppTheme.warning,
    ));

    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final p = _prestamo;

    return Scaffold(
      appBar: AppBar(title: const Text('Registrar cobro')),
      body: p == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info del cliente
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.clienteNombre,
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w700)),
                          Text(p.clienteCedula,
                              style: TextStyle(color: Colors.grey.shade500)),
                          const SizedBox(height: 10),
                          _InfoRow('Modalidad', p.modalidad),
                          _InfoRow('Cuotas', '${p.cuotasPagadas}/${p.numCuotas}'),
                          _InfoRow('Cuota', 'RD\$ ${p.cuotaMonto.toStringAsFixed(2)}'),
                          if (p.tieneMora && p.montoMora > 0)
                            _InfoRow(
                              'Mora pendiente',
                              'RD\$ ${p.montoMora.toStringAsFixed(2)}',
                              valueColor: AppTheme.danger,
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Monto a cobrar',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _montoCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      prefixText: 'RD\$ ',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                  ],
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _loading ? null : _registrarCobro,
                    icon: _loading
                        ? const SizedBox(
                            height: 18, width: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.check_circle_outline),
                    label: const Text('Confirmar cobro'),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'El GPS se captura automáticamente como auditoría.\nSi no hay red, el cobro se sincroniza al recuperar conexión.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text('$label: ',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
          Text(value,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? Colors.grey.shade800)),
        ],
      ),
    );
  }
}
