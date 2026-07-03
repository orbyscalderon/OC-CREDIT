import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/caja_provider.dart';
import '../../../core/theme.dart';

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
    final caja = ref.watch(cajaActivaProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Mi caja')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: caja == null ? _buildSinCaja() : _buildCajaAbierta(caja),
      ),
    );
  }

  Widget _buildSinCaja() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.point_of_sale_outlined, size: 64, color: Colors.grey),
        const SizedBox(height: 16),
        const Text('No tienes una caja abierta',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Text('Abre tu caja para comenzar a registrar cobros.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey.shade500)),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: _loading
              ? null
              : () async {
                  setState(() => _loading = true);
                  await ref.read(cajaActivaProvider.notifier).abrir();
                  if (mounted) setState(() => _loading = false);
                },
          icon: const Icon(Icons.open_in_new),
          label: const Text('Abrir caja'),
        ),
      ],
    );
  }

  Widget _buildCajaAbierta(CajaActiva caja) {
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
                  const Text('Caja abierta',
                      style: TextStyle(
                          fontWeight: FontWeight.w600, color: AppTheme.success)),
                ]),
                const SizedBox(height: 12),
                _Row('Total cobros', 'RD\$ ${caja.totalCobros.toStringAsFixed(2)}',
                    AppTheme.success),
                _Row('Total gastos', 'RD\$ ${caja.totalGastos.toStringAsFixed(2)}',
                    AppTheme.danger),
              ],
            ),
          ),
        ),
        const SizedBox(height: 28),
        const Text('Cerrar caja',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(height: 6),
        Text(
          'Ingresa el monto en efectivo que tienes físicamente ahora.',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _montoCtrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Monto declarado',
            prefixText: 'RD\$ ',
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
                  await ref.read(cajaActivaProvider.notifier).cerrar(monto);
                  if (mounted) {
                    setState(() => _loading = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Caja cerrada correctamente')),
                    );
                  }
                },
          icon: const Icon(Icons.lock_outline),
          label: const Text('Cerrar caja'),
        ),
        const Spacer(),
        Text(
          '© 2026 OC Moon Group LLC. Todos los derechos reservados.',
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
