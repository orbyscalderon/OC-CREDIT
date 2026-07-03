import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import '../../../data/local/sync_queue_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';

const _tipos = [
  'ClienteAusente',
  'ClienteRechazoPago',
  'ClienteCambioUbicacion',
  'IncidenteRuta',
  'Otro',
];

class NovedadScreen extends StatefulWidget {
  const NovedadScreen({super.key});
  @override
  State<NovedadScreen> createState() => _NovedadScreenState();
}

class _NovedadScreenState extends State<NovedadScreen> {
  final _descCtrl = TextEditingController();
  String _tipo = _tipos.first;
  bool _loading = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (_descCtrl.text.trim().isEmpty) return;

    setState(() => _loading = true);
    final uuid = const Uuid().v4();

    Position? pos;
    try {
      pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 8)),
      );
    } catch (_) {}

    final payload = {
      'uuid_idempotencia': uuid,
      'tipo': _tipo,
      'descripcion': _descCtrl.text.trim(),
      if (pos != null) 'lat': pos.latitude,
      if (pos != null) 'lng': pos.longitude,
    };

    try {
      await ApiClient.instance.dio.post('/rutas/novedad', data: payload);
    } catch (_) {
      await SyncQueueDao().enqueue(uuid, '/rutas/novedad', payload);
    }

    if (!mounted) return;
    setState(() => _loading = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Novedad registrada')),
    );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar novedad')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tipo de novedad',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _tipo,
              items: _tipos
                  .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                  .toList(),
              onChanged: (v) => setState(() => _tipo = v!),
              decoration: const InputDecoration(),
            ),
            const SizedBox(height: 16),
            const Text('Descripción',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Describe la novedad…',
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: AppTheme.primary),
                const SizedBox(width: 4),
                Text('El GPS se captura automáticamente',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ],
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loading ? null : _enviar,
              icon: const Icon(Icons.send),
              label: const Text('Enviar novedad'),
            ),
          ],
        ),
      ),
    );
  }
}
