import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/constants/documentos_identidad.dart';
import '../../../data/remote/api_client.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

String _mensajeError(Object e, String fallback) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map) {
      final details = data['details'];
      if (details is Map && details['message'] != null) {
        final m = details['message'];
        return m is List ? m.join(', ') : m.toString();
      }
      if (data['error'] is String) return data['error'] as String;
    }
  }
  return fallback;
}

class ClienteNuevoScreen extends ConsumerStatefulWidget {
  const ClienteNuevoScreen({super.key});
  @override
  ConsumerState<ClienteNuevoScreen> createState() => _ClienteNuevoScreenState();
}

class _ClienteNuevoScreenState extends ConsumerState<ClienteNuevoScreen> {
  final _cedulaCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();
  final _direccionCtrl = TextEditingController();

  List<Map<String, dynamic>> _rutas = [];
  String? _rutaId;
  Position? _ubicacion;
  bool _buscandoUbicacion = false;
  bool _guardando = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarRutas();
  }

  @override
  void dispose() {
    _cedulaCtrl.dispose();
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _telefonoCtrl.dispose();
    _direccionCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarRutas() async {
    try {
      final resp = await ApiClient.instance.dio.get('/rutas');
      if (!mounted) return;
      setState(() => _rutas = (resp.data as List).cast<Map<String, dynamic>>());
    } catch (_) {}
  }

  Future<void> _capturarUbicacion() async {
    setState(() => _buscandoUbicacion = true);
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      if (!mounted) return;
      setState(() {
        _ubicacion = pos;
        _buscandoUbicacion = false;
      });
    } catch (_) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context)!;
      setState(() => _buscandoUbicacion = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.ubicacionError)));
    }
  }

  Future<void> _guardar() async {
    final l10n = AppLocalizations.of(context)!;
    if (_nombreCtrl.text.trim().isEmpty || _apellidoCtrl.text.trim().isEmpty) {
      setState(() => _error = l10n.errorCompletaCamposObligatorios);
      return;
    }

    final tipoDoc = tipoDocumentoPorPais(ref.read(authStateProvider).tenantConfig.pais);
    setState(() { _guardando = true; _error = null; });
    try {
      final resp = await ApiClient.instance.dio.post('/clientes', data: {
        if (_cedulaCtrl.text.trim().isNotEmpty) 'cedula': _cedulaCtrl.text.trim(),
        'tipo_documento': tipoDoc.codigo,
        'nombre': _nombreCtrl.text.trim(),
        'apellido': _apellidoCtrl.text.trim(),
        if (_telefonoCtrl.text.trim().isNotEmpty) 'telefono': _telefonoCtrl.text.trim(),
        if (_direccionCtrl.text.trim().isNotEmpty) 'direccion_casa': _direccionCtrl.text.trim(),
        if (_rutaId != null) 'ruta_id': _rutaId,
        if (_ubicacion != null) 'latitud_casa': _ubicacion!.latitude,
        if (_ubicacion != null) 'longitud_casa': _ubicacion!.longitude,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.clienteCreado)));
      Navigator.of(context).pop(resp.data);
    } catch (e) {
      setState(() {
        _error = _mensajeError(e, l10n.errorNoSePudoCompletarOperacion);
        _guardando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pais = ref.watch(authStateProvider).tenantConfig.pais;
    final tipoDoc = tipoDocumentoPorPais(pais);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.clienteNuevoTitulo)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tipoDoc.etiqueta, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(controller: _cedulaCtrl),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.nombreLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      TextField(controller: _nombreCtrl),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.apellidoLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      TextField(controller: _apellidoCtrl),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(l10n.telefonoOpcional, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(controller: _telefonoCtrl, keyboardType: TextInputType.phone),
            const SizedBox(height: 16),
            Text(l10n.direccionLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(controller: _direccionCtrl, maxLines: 2),
            const SizedBox(height: 16),
            Text(l10n.ubicacionCasa, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _buscandoUbicacion ? null : _capturarUbicacion,
                  icon: _buscandoUbicacion
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.my_location, size: 18),
                  label: Text(_ubicacion != null ? l10n.actualizarUbicacion : l10n.usarUbicacionActual),
                ),
                if (_ubicacion != null) ...[
                  const SizedBox(width: 10),
                  const Icon(Icons.check_circle, color: Colors.green, size: 18),
                ],
              ],
            ),
            const SizedBox(height: 16),
            Text(l10n.rutaDeCobro, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _rutaId,
              hint: Text(l10n.sinAsignar),
              items: _rutas
                  .map((r) => DropdownMenuItem(value: r['id'] as String, child: Text(r['nombre'] as String)))
                  .toList(),
              onChanged: (v) => setState(() => _rutaId = v),
            ),
            const SizedBox(height: 24),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
            ],
            ElevatedButton(
              onPressed: _guardando ? null : _guardar,
              child: Text(_guardando ? l10n.enviando : l10n.crearCliente),
            ),
          ],
        ),
      ),
    );
  }
}
