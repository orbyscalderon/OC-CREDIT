import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../data/local/sync_queue_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

const _modalidades = ['Diario', 'Semanal', 'Quincenal', 'Mensual'];

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

class NuevaSolicitudScreen extends ConsumerStatefulWidget {
  const NuevaSolicitudScreen({super.key});
  @override
  ConsumerState<NuevaSolicitudScreen> createState() => _NuevaSolicitudScreenState();
}

class _NuevaSolicitudScreenState extends ConsumerState<NuevaSolicitudScreen> {
  final _buscarCtrl = TextEditingController();
  final _capitalCtrl = TextEditingController();
  final _cuotasCtrl = TextEditingController();
  final _tasaCtrl = TextEditingController();
  final _notasCtrl = TextEditingController();

  List<Map<String, dynamic>> _resultados = [];
  Map<String, dynamic>? _clienteSeleccionado;
  String _modalidad = 'Diario';
  bool _buscando = false;
  bool _enviando = false;
  String? _error;

  @override
  void dispose() {
    _buscarCtrl.dispose();
    _capitalCtrl.dispose();
    _cuotasCtrl.dispose();
    _tasaCtrl.dispose();
    _notasCtrl.dispose();
    super.dispose();
  }

  Future<void> _buscar(String q) async {
    if (q.trim().length < 2) {
      setState(() => _resultados = []);
      return;
    }
    setState(() => _buscando = true);
    try {
      final resp = await ApiClient.instance.dio.get('/clientes/buscar', queryParameters: {'q': q.trim()});
      setState(() {
        _resultados = (resp.data as List).cast<Map<String, dynamic>>();
        _buscando = false;
      });
    } catch (_) {
      setState(() => _buscando = false);
    }
  }

  Future<void> _enviar() async {
    final l10n = AppLocalizations.of(context)!;
    final cliente = _clienteSeleccionado;
    if (cliente == null) return;

    final capital = num.tryParse(_capitalCtrl.text);
    final cuotas = int.tryParse(_cuotasCtrl.text);
    if (capital == null || capital <= 0 || cuotas == null || cuotas <= 0) {
      setState(() => _error = l10n.errorCompletaCamposObligatorios);
      return;
    }

    setState(() { _enviando = true; _error = null; });

    final uuid = const Uuid().v4();
    final payload = {
      'uuid_idempotencia': uuid,
      'cliente_id': cliente['id'],
      'ruta_id': cliente['ruta_id'],
      'capital_solicitado': capital,
      'modalidad': _modalidad,
      'numero_cuotas': cuotas,
      if (_tasaCtrl.text.trim().isNotEmpty) 'tasa_interes_propuesta': num.tryParse(_tasaCtrl.text),
      if (_notasCtrl.text.trim().isNotEmpty) 'notas': _notasCtrl.text.trim(),
    };

    try {
      await ApiClient.instance.dio.post('/prestamos/solicitar', data: payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.solicitudCreada)));
      Navigator.of(context).pop();
    } on DioException catch (e) {
      // El servidor respondió (cliente ya tiene préstamo activo, ruta no
      // asignada, etc.) -- es un rechazo real, no encolar, reintentarlo
      // fallaría exactamente igual.
      if (e.response != null) {
        if (!mounted) return;
        setState(() {
          _error = _mensajeError(e, l10n.errorNoSePudoCompletarOperacion);
          _enviando = false;
        });
        return;
      }
      // Sin respuesta del servidor = sin red: encolar para sync posterior.
      await SyncQueueDao().enqueue(uuid, '/prestamos/solicitar', payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.sinRedSolicitudSeEnviara)),
      );
      Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _error = _mensajeError(e, l10n.errorNoSePudoCompletarOperacion);
        _enviando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;
    final cliente = _clienteSeleccionado;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.nuevaSolicitud)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.clienteLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (cliente == null) ...[
              TextField(
                controller: _buscarCtrl,
                decoration: InputDecoration(
                  hintText: l10n.buscarClienteCedula,
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _buscando
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        )
                      : null,
                ),
                onChanged: _buscar,
              ),
              const SizedBox(height: 8),
              ..._resultados.map((c) => Card(
                    child: ListTile(
                      title: Text('${c['nombre']} ${c['apellido']}'),
                      subtitle: Text(c['cedula'] as String? ?? ''),
                      onTap: () => setState(() {
                        _clienteSeleccionado = c;
                        _resultados = [];
                        _buscarCtrl.clear();
                      }),
                    ),
                  )),
            ] else
              Card(
                child: ListTile(
                  title: Text('${cliente['nombre']} ${cliente['apellido']}'),
                  subtitle: Text(cliente['cedula'] as String? ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _clienteSeleccionado = null),
                  ),
                ),
              ),
            const SizedBox(height: 20),
            Text(l10n.capitalSolicitado, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _capitalCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(prefixText: '$simbolo '),
            ),
            const SizedBox(height: 16),
            Text(l10n.modalidadLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _modalidad,
              items: _modalidades.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _modalidad = v ?? _modalidad),
            ),
            const SizedBox(height: 16),
            Text(l10n.cuotasLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _cuotasCtrl,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            Text(l10n.tasaPropuestaOpcional, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _tasaCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 16),
            Text(l10n.descripcionOpcional, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(controller: _notasCtrl, maxLines: 2),
            const SizedBox(height: 24),
            if (_error != null) ...[
              Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
            ],
            ElevatedButton(
              onPressed: (cliente == null || _enviando) ? null : _enviar,
              child: Text(_enviando ? l10n.enviando : l10n.enviarSolicitud),
            ),
          ],
        ),
      ),
    );
  }
}
