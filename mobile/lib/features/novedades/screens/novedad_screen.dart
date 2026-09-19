import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/local/sync_queue_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../cajas/providers/caja_provider.dart';
import '../../../l10n/app_localizations.dart';

/// Debe coincidir exactamente con el enum TipoNovedad del backend
/// (backend/src/common/constants/roles.enum.ts).
const _tipos = {
  'Cliente_No_Estaba': 'Cliente no estaba',
  'Cliente_Sin_Dinero': 'Cliente sin dinero',
  'Otro': 'Otro',
};

class NovedadScreen extends ConsumerStatefulWidget {
  const NovedadScreen({super.key});
  @override
  ConsumerState<NovedadScreen> createState() => _NovedadScreenState();
}

class _NovedadScreenState extends ConsumerState<NovedadScreen> {
  final _descCtrl = TextEditingController();
  String _tipo = _tipos.keys.first;
  bool _loading = false;
  bool _loadingClientes = true;
  List<PrestamoCache> _prestamos = [];
  PrestamoCache? _seleccionado;

  @override
  void initState() {
    super.initState();
    _cargarClientes();
  }

  Future<void> _cargarClientes() async {
    final lista = await PrestamoCacheDao().getAll();
    if (!mounted) return;
    setState(() {
      _prestamos = lista;
      _seleccionado = lista.isNotEmpty ? lista.first : null;
      _loadingClientes = false;
    });
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final l10n = AppLocalizations.of(context)!;
    final caja = ref.read(cajaActivaProvider);
    if (caja == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorDebesAbrirCajaAntesNovedad)),
      );
      return;
    }
    if (_seleccionado == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorSeleccionaClienteNovedad)),
      );
      return;
    }

    setState(() => _loading = true);
    final uuid = const Uuid().v4();

    Position? pos;
    try {
      pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (_) {}

    if (pos == null) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGpsObligatorioVisita)),
        );
      }
      return;
    }

    final payload = {
      'uuid_idempotencia': uuid,
      'cliente_id': _seleccionado!.clienteId,
      'prestamo_id': _seleccionado!.id,
      'caja_id': caja.id,
      'tipo': _tipo,
      'descripcion': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
      'latitud': pos.latitude,
      'longitud': pos.longitude,
    };

    var sincronizado = true;
    try {
      await ApiClient.instance.dio.post('/rutas/novedades', data: payload);
    } catch (_) {
      sincronizado = false;
      await SyncQueueDao().enqueue(uuid, '/rutas/novedades', payload);
    }

    if (!mounted) return;
    setState(() => _loading = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(sincronizado
          ? l10n.novedadRegistrada
          : l10n.sinConexionNovedadSeEnviara)),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.registrarNovedad)),
      body: _loadingClientes
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.clienteLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  if (_prestamos.isEmpty)
                    Text(l10n.sinClientesEnRutaDelDia,
                        style: TextStyle(color: Colors.grey.shade600))
                  else
                    DropdownButtonFormField<PrestamoCache>(
                      value: _seleccionado,
                      isExpanded: true,
                      items: _prestamos
                          .map((p) => DropdownMenuItem(
                                value: p,
                                child: Text('${p.clienteNombre} — ${p.clienteCedula}',
                                    overflow: TextOverflow.ellipsis),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _seleccionado = v),
                      decoration: const InputDecoration(),
                    ),
                  const SizedBox(height: 16),
                  Text(l10n.tipoDeNovedad, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _tipo,
                    items: _tipos.entries
                        .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                        .toList(),
                    onChanged: (v) => setState(() => _tipo = v!),
                    decoration: const InputDecoration(),
                  ),
                  const SizedBox(height: 16),
                  Text(l10n.descripcionOpcional, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _descCtrl,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: l10n.hintDescribeNovedad,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 4),
                      Text(l10n.notaGpsObligatorioVisita,
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: (_loading || _prestamos.isEmpty) ? null : _enviar,
                    icon: const Icon(Icons.send),
                    label: Text(_loading ? l10n.enviando : l10n.enviarNovedad),
                  ),
                ],
              ),
            ),
    );
  }
}
