import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

// GET /reportes/dashboard devuelve columnas agregadas de Postgres
// (SUM/COUNT) que llegan como String, no num — de ahí este parser en vez de
// castear directo.
num _n(dynamic v) => v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});
  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  Map<String, dynamic>? _data;
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
      final resp = await ApiClient.instance.dio.get('/reportes/dashboard');
      setState(() { _data = resp.data as Map<String, dynamic>; _loading = false; });
    } catch (_) {
      setState(() {
        _error = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.dashboardTitulo)),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _ErrorView(mensaje: _error!, onRetry: _cargar, reintentarLabel: l10n.reintentar)
                : _buildContenido(l10n, simbolo),
      ),
    );
  }

  Widget _buildContenido(AppLocalizations l10n, String simbolo) {
    final data = _data!;
    final cartera = data['cartera'] as Map<String, dynamic>? ?? {};
    final recaudo = data['recaudo_dia'] as Map<String, dynamic>? ?? {};
    final cajas = data['cajas_hoy'] as Map<String, dynamic>? ?? {};
    final mora = data['mora'] as Map<String, dynamic>? ?? {};
    final topMorosos = (data['top_morosos'] as List?) ?? const [];

    String fmt(dynamic v) => '$simbolo ${_n(v).toStringAsFixed(2)}';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            _KpiCard(
              label: l10n.kpiCarteraTotal,
              value: fmt(cartera['saldo_total_pendiente']),
              icon: Icons.account_balance_wallet_outlined,
              color: AppTheme.primary,
            ),
            _KpiCard(
              label: l10n.kpiRecaudoHoy,
              value: fmt(recaudo['recaudo_hoy']),
              icon: Icons.payments_outlined,
              color: AppTheme.success,
            ),
            _KpiCard(
              label: l10n.kpiCajasAbiertas,
              value: '${_n(cajas['cajas_abiertas']).toInt()}',
              icon: Icons.point_of_sale_outlined,
              color: AppTheme.secondary,
            ),
            _KpiCard(
              label: l10n.kpiMoraTotal,
              value: fmt(mora['mora_total_pendiente']),
              icon: Icons.warning_amber_outlined,
              color: AppTheme.danger,
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(l10n.topMorosos, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 8),
        if (topMorosos.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(l10n.sinMoraActiva, style: TextStyle(color: Colors.grey.shade600)),
          )
        else
          ...topMorosos.map((m) {
            final row = m as Map<String, dynamic>;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('${row['nombre']} ${row['apellido']}'),
                subtitle: Text(l10n.diasDeMora(_n(row['dias_mora']).toInt())),
                trailing: Text(
                  fmt(row['mora_pendiente']),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.danger),
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _KpiCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 22),
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String mensaje;
  final VoidCallback onRetry;
  final String reintentarLabel;
  const _ErrorView({required this.mensaje, required this.onRetry, required this.reintentarLabel});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                const SizedBox(height: 12),
                Text(mensaje, style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: onRetry, child: Text(reintentarLabel)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
