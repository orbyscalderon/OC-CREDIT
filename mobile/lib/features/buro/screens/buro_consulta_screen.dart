import 'package:flutter/material.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';

class BuroConsultaScreen extends StatefulWidget {
  const BuroConsultaScreen({super.key});
  @override
  State<BuroConsultaScreen> createState() => _BuroConsultaScreenState();
}

class _BuroConsultaScreenState extends State<BuroConsultaScreen> {
  final _cedulaCtrl = TextEditingController();
  bool _loading = false;
  Map<String, dynamic>? _perfil;
  String? _error;

  @override
  void dispose() {
    _cedulaCtrl.dispose();
    super.dispose();
  }

  Future<void> _consultar() async {
    final cedula = _cedulaCtrl.text.trim();
    if (cedula.isEmpty) return;

    setState(() { _loading = true; _perfil = null; _error = null; });

    try {
      final resp = await ApiClient.instance.dio.post('/buro/consultar', data: {
        'cedula': cedula,
        'motivo_consulta': 'Verificación antes de préstamo (app móvil)',
      });
      setState(() {
        _perfil = resp.data as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'No se pudo consultar. Verifica conexión.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buró de Crédito')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _cedulaCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: '000-0000000-0',
                      labelText: 'Cédula del cliente',
                    ),
                    onSubmitted: (_) => _consultar(),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _loading ? null : _consultar,
                  child: _loading
                      ? const SizedBox(
                          height: 18, width: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Consultar'),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger)),
            ],
            if (_perfil != null) ...[
              const SizedBox(height: 20),
              _PerfilWidget(perfil: _perfil!),
            ],
          ],
        ),
      ),
    );
  }
}

class _PerfilWidget extends StatelessWidget {
  final Map<String, dynamic> perfil;
  const _PerfilWidget({required this.perfil});

  @override
  Widget build(BuildContext context) {
    final rec = perfil['recomendacion'] as String? ?? '';
    final nivel = perfil['nivel_riesgo_consolidado'] as String? ?? 'Bajo';
    final isNoPrestable = rec == 'NO_PRESTAR';

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isNoPrestable
                ? AppTheme.danger.withOpacity(0.1)
                : AppTheme.success.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isNoPrestable ? AppTheme.danger : AppTheme.success,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Icon(
                isNoPrestable ? Icons.cancel : Icons.check_circle,
                color: isNoPrestable ? AppTheme.danger : AppTheme.success,
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rec.replaceAll('_', ' '),
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: isNoPrestable ? AppTheme.danger : AppTheme.success),
                    ),
                    Text(
                      '${perfil['nombre']} ${perfil['apellido']}',
                      style: const TextStyle(fontSize: 13),
                    ),
                    Text(
                      'Riesgo: $nivel  |  Reportes: ${perfil['total_reportes']}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if ((perfil['reportes'] as List?)?.isNotEmpty == true) ...[
          const SizedBox(height: 16),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Historial de reportes',
                style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 8),
          ...(perfil['reportes'] as List).map((r) {
            final reporte = r as Map<String, dynamic>;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(reporte['tenant_nombre'] as String? ?? '',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(reporte['motivo_reporte'] as String? ?? '',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    Text(
                      'RD\$ ${((reporte['deuda_original'] as num?) ?? 0).toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.danger),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}
