import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

// El backend envía errores como {statusCode, error, details} (ver
// HttpExceptionFilter) — `details.message` trae el mensaje real de
// class-validator (ej. "capital_aprobado must be a positive number"),
// mientras que `error` suele ser un mensaje genérico o un array.
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

class SolicitudesScreen extends ConsumerStatefulWidget {
  const SolicitudesScreen({super.key});
  @override
  ConsumerState<SolicitudesScreen> createState() => _SolicitudesScreenState();
}

class _SolicitudesScreenState extends ConsumerState<SolicitudesScreen> {
  List<Map<String, dynamic>> _solicitudes = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/prestamos', queryParameters: {
        'estado': 'Pendiente',
        'limit': 50,
      });
      final data = (resp.data as Map<String, dynamic>)['data'] as List;
      setState(() {
        _solicitudes = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
        _loading = false;
      });
    }
  }

  Future<void> _abrirAprobar(Map<String, dynamic> p) async {
    final l10n = AppLocalizations.of(context)!;
    final capitalCtrl = TextEditingController(text: '${p['capital_aprobado']}');
    final tasaCtrl = TextEditingController(text: '${p['tasa_interes']}');
    DateTime fecha = DateTime.now().add(const Duration(days: 1));

    // El préstamo pendiente puede no tener cobrador_id todavía (solicitudes
    // creadas sin ruta asignada, o datos de prueba) — el backend exige un
    // cobrador_id válido para aprobar, así que se deja elegir en vez de
    // asumir que ya viene en el registro.
    List<Map<String, dynamic>> cobradores = [];
    try {
      final resp = await ApiClient.instance.dio.get('/usuarios');
      cobradores = (resp.data as List)
          .cast<Map<String, dynamic>>()
          .where((e) => e['rol'] == 'cobrador_tenant' && e['activo'] == true)
          .toList();
    } catch (_) {
      // Si falla, se sigue sin lista — el dropdown queda vacío y el admin
      // ve el mensaje de error del backend al intentar aprobar sin cobrador.
    }
    String? cobradorId = p['cobrador_id'] as String?;
    if (cobradorId != null && !cobradores.any((c) => c['id'] == cobradorId)) {
      cobradorId = null;
    }
    cobradorId ??= cobradores.isNotEmpty ? cobradores.first['id'] as String : null;

    if (!mounted) return;
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(l10n.aprobarSolicitud),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: capitalCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.capitalAprobado),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: tasaCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.tasaDeInteres),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: cobradorId,
                  decoration: InputDecoration(labelText: l10n.cobradorAsignado),
                  items: cobradores
                      .map((c) => DropdownMenuItem(
                            value: c['id'] as String,
                            child: Text('${c['nombre']} ${c['apellido']}', overflow: TextOverflow.ellipsis),
                          ))
                      .toList(),
                  onChanged: (v) => setLocal(() => cobradorId = v),
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(l10n.fechaPrimerPago),
                  subtitle: Text('${fecha.year}-${fecha.month.toString().padLeft(2, '0')}-${fecha.day.toString().padLeft(2, '0')}'),
                  trailing: const Icon(Icons.calendar_today, size: 18),
                  onTap: () async {
                    final elegida = await showDatePicker(
                      context: ctx,
                      initialDate: fecha,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (elegida != null) setLocal(() => fecha = elegida);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancelar)),
            ElevatedButton(
              onPressed: cobradorId == null ? null : () => Navigator.pop(ctx, true),
              child: Text(l10n.aprobar),
            ),
          ],
        ),
      ),
    );

    if (confirmado != true || cobradorId == null) return;

    try {
      final fechaStr = '${fecha.year}-${fecha.month.toString().padLeft(2, '0')}-${fecha.day.toString().padLeft(2, '0')}';
      await ApiClient.instance.dio.post('/prestamos/${p['id']}/aprobar', data: {
        'capital_aprobado': num.tryParse(capitalCtrl.text) ?? p['capital_aprobado'],
        'tasa_interes': num.tryParse(tasaCtrl.text) ?? p['tasa_interes'],
        'cobrador_id': cobradorId,
        'fecha_primer_pago': fechaStr,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.solicitudAprobada)));
      _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_mensajeError(e, l10n.errorNoSePudoCompletarOperacion))),
      );
    }
  }

  Future<void> _abrirRechazar(Map<String, dynamic> p) async {
    final l10n = AppLocalizations.of(context)!;
    final motivoCtrl = TextEditingController();

    final confirmado = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(l10n.rechazarSolicitud),
          content: TextField(
            controller: motivoCtrl,
            maxLines: 3,
            autofocus: true,
            decoration: InputDecoration(labelText: l10n.motivoDelRechazo),
            // Sin este listener el botón "Rechazar" nunca se re-evalúa: un
            // AlertDialog normal no se reconstruye solo porque cambie el
            // texto de un controller ajeno a su propio setState.
            onChanged: (_) => setLocal(() {}),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancelar)),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
              onPressed: motivoCtrl.text.trim().isEmpty ? null : () => Navigator.pop(ctx, true),
              child: Text(l10n.rechazar),
            ),
          ],
        ),
      ),
    );

    if (confirmado != true) return;
    if (motivoCtrl.text.trim().isEmpty) return;

    try {
      await ApiClient.instance.dio.post('/prestamos/${p['id']}/rechazar', data: {
        'motivo': motivoCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.solicitudRechazada)));
      _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_mensajeError(e, l10n.errorNoSePudoCompletarOperacion))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.solicitudesPendientes)),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: TextStyle(color: Colors.grey.shade600)))
                : _solicitudes.isEmpty
                    ? LayoutBuilder(
                        builder: (_, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(child: Text(l10n.sinSolicitudesPendientes)),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _solicitudes.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final p = _solicitudes[i];
                          final cliente = p['cliente'] as Map<String, dynamic>?;
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    cliente != null ? '${cliente['nombre']} ${cliente['apellido']}' : '—',
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                  ),
                                  if (cliente?['cedula'] != null)
                                    Text(cliente!['cedula'] as String, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                                  const SizedBox(height: 6),
                                  Text(
                                    '$simbolo ${(p['capital_aprobado'] as num? ?? 0).toStringAsFixed(2)}  ·  ${p['modalidad']}  ·  ${p['num_cuotas']} ${l10n.cuotasLabel.toLowerCase()}',
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          style: OutlinedButton.styleFrom(foregroundColor: AppTheme.danger),
                                          onPressed: () => _abrirRechazar(p),
                                          icon: const Icon(Icons.close, size: 16),
                                          label: Text(l10n.rechazar),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () => _abrirAprobar(p),
                                          icon: const Icon(Icons.check, size: 16),
                                          label: Text(l10n.aprobar),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
