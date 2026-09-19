import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/caja_provider.dart';
import '../../../core/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

String _mensajeError(BuildContext context, Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      final err = data['error'];
      if (err is List && err.isNotEmpty) return err.first.toString();
      if (err is String) return err;
    }
    return AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
  }
  return e.toString().replaceFirst('Exception: ', '');
}

class CajaScreen extends ConsumerStatefulWidget {
  const CajaScreen({super.key});
  @override
  ConsumerState<CajaScreen> createState() => _CajaScreenState();
}

class _CajaScreenState extends ConsumerState<CajaScreen> {
  final _montoCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _montoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final caja = ref.watch(cajaActivaProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.miCaja)),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: caja == null ? _buildSinCaja(l10n) : _buildCajaAbierta(l10n, caja),
      ),
    );
  }

  Widget _buildSinCaja(AppLocalizations l10n) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.point_of_sale_outlined, size: 64, color: Colors.grey),
        const SizedBox(height: 16),
        Text(l10n.sinCajaAbierta,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Text(l10n.abreTuCajaParaComenzar,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade500)),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: _loading
              ? null
              : () async {
                  setState(() => _loading = true);
                  try {
                    await ref.read(cajaActivaProvider.notifier).abrir();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(_mensajeError(context, e))),
                      );
                    }
                  } finally {
                    if (mounted) setState(() => _loading = false);
                  }
                },
          icon: const Icon(Icons.open_in_new),
          label: Text(l10n.abrirCaja),
        ),
      ],
    );
  }

  Widget _buildCajaAbierta(AppLocalizations l10n, CajaActiva caja) {
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: const Color(0xFFF0FDF4),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.circle, size: 10, color: AppTheme.success),
                  const SizedBox(width: 6),
                  Text(l10n.cajaAbierta,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, color: AppTheme.success)),
                ]),
                const SizedBox(height: 12),
                _Row(l10n.totalCobros, '$simbolo ${caja.totalCobros.toStringAsFixed(2)}',
                    AppTheme.success),
                _Row(l10n.totalGastos, '$simbolo ${caja.totalGastos.toStringAsFixed(2)}',
                    AppTheme.danger),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        Text(l10n.cerrarCaja,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 6),
        Text(
          l10n.ingresaMontoEfectivoFisico,
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _montoCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: l10n.montoDeclarado,
            prefixText: '$simbolo ',
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
          onPressed: _loading
              ? null
              : () async {
                  final monto = double.tryParse(_montoCtrl.text.trim());
                  if (monto == null) return;
                  setState(() => _loading = true);
                  try {
                    await ref.read(cajaActivaProvider.notifier).cerrar(monto);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.cajaCerradaCorrectamente)),
                      );
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(_mensajeError(context, e))),
                      );
                    }
                  } finally {
                    if (mounted) setState(() => _loading = false);
                  }
                },
          icon: const Icon(Icons.lock_outline),
          label: Text(l10n.cerrarCaja),
        ),
        const Spacer(),
        Text(
          l10n.copyrightOcaHoldingCorto,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade400),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _Row(this.label, this.value, this.color);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 13)),
            Text(value,
                style: TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      );
}
