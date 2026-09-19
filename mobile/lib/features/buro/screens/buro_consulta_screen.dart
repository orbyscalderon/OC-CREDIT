import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/constants/documentos_identidad.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class BuroConsultaScreen extends ConsumerStatefulWidget {
  const BuroConsultaScreen({super.key});
  @override
  ConsumerState<BuroConsultaScreen> createState() => _BuroConsultaScreenState();
}

class _BuroConsultaScreenState extends ConsumerState<BuroConsultaScreen> {
  final _cedulaCtrl = TextEditingController();
  bool _loading = false;
  Map<String, dynamic>? _perfil;
  String? _error;

  @override
  void dispose() {
    _cedulaCtrl.dispose();
    super.dispose();
  }

  Future<void> _consultar(String tipoDocumento) async {
    final cedula = _cedulaCtrl.text.trim();
    if (cedula.isEmpty) return;

    setState(() { _loading = true; _perfil = null; _error = null; });

    try {
      final resp = await ApiClient.instance.dio.post('/buro/consultar', data: {
        'cedula': cedula,
        'tipo_documento': tipoDocumento,
      });
      setState(() {
        _perfil = resp.data as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = AppLocalizations.of(context)!.errorNoSePudoConsultarVerificaConexion;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tenantConfig = ref.watch(authStateProvider).tenantConfig;
    final tipoDoc = tipoDocumentoPorPais(tenantConfig.pais);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.buroCreditoTitulo)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextField(
                    controller: _cedulaCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: l10n.hintCedulaFormato,
                      labelText: l10n.documentoDelCliente(tipoDoc.etiqueta),
                    ),
                    onSubmitted: (_) => _consultar(tipoDoc.codigo),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  // El tema global fuerza minimumSize a ancho infinito
                  // (pensado para botones de pantalla completa); dentro de
                  // este Row, compitiendo con el Expanded del campo de
                  // cédula, eso rompe el layout de todo el Row en silencio
                  // (pantalla en blanco, sin excepción visible). Se fija un
                  // ancho acotado solo para este botón.
                  style: ElevatedButton.styleFrom(minimumSize: const Size(64, 56)),
                  onPressed: _loading ? null : () => _consultar(tipoDoc.codigo),
                  child: _loading
                      ? const SizedBox(
                          height: 18, width: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(l10n.consultar),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppTheme.danger)),
            ],
            if (_perfil != null) ...[
              const SizedBox(height: 20),
              _PerfilWidget(perfil: _perfil!, simboloMoneda: tenantConfig.simboloMoneda),
            ],
          ],
        ),
      ),
    );
  }
}

class _PerfilWidget extends StatelessWidget {
  final Map<String, dynamic> perfil;
  final String simboloMoneda;
  const _PerfilWidget({required this.perfil, required this.simboloMoneda});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
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
                      l10n.riesgoReportesLinea(nivel, '${perfil['total_reportes']}'),
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
          Align(
            alignment: Alignment.centerLeft,
            child: Text(l10n.historialDeReportes,
                style: const TextStyle(fontWeight: FontWeight.w600)),
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
                    Text((reporte['motivo'] as String? ?? '').replaceAll('_', ' '),
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    Text(
                      '$simboloMoneda ${((reporte['saldo_impagado'] as num?) ?? 0).toStringAsFixed(2)}',
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
