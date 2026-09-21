import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/local/sync_queue_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../data/services/sync_service.dart';
import '../../../core/theme.dart';
import '../../cajas/providers/caja_provider.dart';
import '../../printing/thermal_print_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

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
  File? _foto;

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

  Future<void> _tomarFoto() async {
    try {
      final imagen = await ImagePicker().pickImage(
        source: ImageSource.camera,
        imageQuality: 70,
        maxWidth: 1600,
      );
      if (imagen != null && mounted) {
        setState(() => _foto = File(imagen.path));
      }
    } catch (_) {
      // Cámara no disponible/denegada — la foto es evidencia opcional, no
      // debe bloquear el cobro en efectivo (eso sí es obligatorio).
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(AppLocalizations.of(context)!.errorNoSePudoAbrirCamara),
        ));
      }
    }
  }

  /// Sube la foto de evidencia DESPUÉS de que el cobro ya quedó registrado.
  /// Best-effort: si falla (o el cobro se encoló offline y no hay
  /// transaccionId todavía), no reintenta ni bloquea nada — el dinero ya
  /// quedó registrado y auditado por GPS+idempotencia, que es lo crítico.
  /// Subir la evidencia offline requeriría una cola de adjuntos binarios
  /// aparte (SyncQueueDao hoy solo encola JSON), fuera de alcance de esta
  /// función puntual.
  Future<void> _subirFotoEvidencia(String transaccionId) async {
    if (_foto == null) return;
    try {
      final formData = FormData.fromMap({
        'foto': await MultipartFile.fromFile(_foto!.path),
      });
      await ApiClient.instance.dio.post('/cobros/$transaccionId/foto', data: formData);
    } catch (_) {
      // Silencioso a propósito — ver comentario del método.
    }
  }

  Future<Position?> _getLocation() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _registrarCobro() async {
    final l10n = AppLocalizations.of(context)!;
    final monto = double.tryParse(_montoCtrl.text.trim());
    if (monto == null || monto <= 0) {
      setState(() => _error = l10n.errorIngresaMontoValido);
      return;
    }

    // No permitir cobrar más de lo que realmente se debe -- mismo tope que
    // el backend (saldo_pendiente_total = todas las cuotas + mora), validado
    // también aquí porque el cobrador puede estar sin red y el rechazo del
    // servidor solo se vería al reintentar el envío encolado.
    final saldoTotal = _prestamo?.saldoTotalPendiente ?? 0;
    if (saldoTotal > 0 && monto > saldoTotal) {
      final simbolo = ref.read(authStateProvider).tenantConfig.simboloMoneda;
      setState(() => _error = l10n.errorMontoMayorASaldo(
            '$simbolo ${monto.toStringAsFixed(2)}',
            '$simbolo ${saldoTotal.toStringAsFixed(2)}',
          ));
      return;
    }

    setState(() { _loading = true; _error = null; });

    // Espera a que el provider termine de cargar (cache local u online) antes
    // de decidir si hay caja abierta -- si se lee de inmediato, un cobrador
    // que nunca visitó "Mi caja" en esta sesión pierde la carrera contra la
    // carga async del provider y ve "Debes abrir una caja primero" aunque sí
    // tenga una caja abierta.
    await ref.read(cajaActivaProvider.notifier).listo;
    if (!mounted) return;
    final cajaId = ref.read(cajaActivaProvider)?.id;
    if (cajaId == null) {
      setState(() { _loading = false; _error = l10n.errorDebesAbrirCajaPrimero; });
      return;
    }

    final uuid = const Uuid().v4();
    final pos = await _getLocation();

    // El GPS es obligatorio (geocerca antifraude del lado del servidor) — sin
    // coordenadas el backend rechazaría el cobro igual, mejor avisar aquí de
    // una vez que reintentar sin decir por qué falló.
    if (pos == null) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = l10n.errorGpsObligatorio;
        });
      }
      return;
    }

    final payload = {
      'uuid_idempotencia': uuid,
      'prestamo_id': widget.prestamoId,
      'monto_cobrado': monto,
      'caja_id': cajaId,
      'latitud': pos.latitude,
      'longitud': pos.longitude,
    };

    bool syncedOnline = false;

    try {
      final resp = await ApiClient.instance.dio.post('/cobros/registrar', data: payload);
      syncedOnline = true;
      final transaccionId = resp.data?['transaccion_id'] as String?;
      if (transaccionId != null) {
        await _subirFotoEvidencia(transaccionId);
      }
    } catch (_) {
      // Sin red: encolar para sync posterior
      await SyncQueueDao().enqueue(uuid, '/cobros/registrar', payload);
    }

    if (!mounted) return;

    // Imprimir recibo por Bluetooth
    final tenantConfig = ref.read(authStateProvider).tenantConfig;
    await ThermalPrintService.instance.printRecibo(
      clienteNombre: _prestamo?.clienteNombre ?? '',
      prestamo: _prestamo!,
      montoCobrado: monto,
      uuid: uuid,
      syncedOnline: syncedOnline,
      tenantNombre: tenantConfig.nombreEmpresa,
      textoPieRecibo: tenantConfig.textoPieRecibo,
      simboloMoneda: tenantConfig.simboloMoneda,
    );

    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(syncedOnline
          ? l10n.cobroRegistradoCorrectamente
          : l10n.sinRedCobroGuardado),
      backgroundColor: syncedOnline ? AppTheme.success : AppTheme.warning,
    ));

    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final p = _prestamo;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.registrarCoboTitulo)),
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
                          _InfoRow(l10n.modalidadLabel, p.modalidad),
                          _InfoRow(l10n.cuotasLabel, '${p.cuotasPagadas}/${p.numCuotas}'),
                          _InfoRow(l10n.cuotaLabel, '$simbolo ${p.cuotaMonto.toStringAsFixed(2)}'),
                          if (p.tieneMora && p.montoMora > 0)
                            _InfoRow(
                              l10n.moraPendienteLabel,
                              '$simbolo ${p.montoMora.toStringAsFixed(2)}',
                              valueColor: AppTheme.danger,
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(l10n.montoACobrar,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _montoCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      prefixText: '$simbolo ',
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(l10n.fotoDeEvidenciaOpcional,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (_foto != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.file(_foto!, height: 160, fit: BoxFit.cover, width: double.infinity),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _tomarFoto,
                            icon: const Icon(Icons.camera_alt_outlined, size: 18),
                            label: Text(l10n.repetirFoto),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: () => setState(() => _foto = null),
                          icon: const Icon(Icons.delete_outline, color: AppTheme.danger),
                          tooltip: l10n.quitarFoto,
                        ),
                      ],
                    ),
                  ] else
                    OutlinedButton.icon(
                      onPressed: _tomarFoto,
                      icon: const Icon(Icons.camera_alt_outlined, size: 18),
                      label: Text(l10n.tomarFoto),
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
                    label: Text(l10n.confirmarCobro),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.notaGpsAuditoriaYSync,
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
