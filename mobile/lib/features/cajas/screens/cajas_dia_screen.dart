import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class CajasDiaScreen extends ConsumerStatefulWidget {
  const CajasDiaScreen({super.key});
  @override
  ConsumerState<CajasDiaScreen> createState() => _CajasDiaScreenState();
}

class _CajasDiaScreenState extends ConsumerState<CajasDiaScreen> {
  List<Map<String, dynamic>> _cajas = [];
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
      final resp = await ApiClient.instance.dio.get('/cajas/dia');
      final data = resp.data as List;
      setState(() {
        _cajas = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
        _loading = false;
      });
    }
  }

  Color _colorEstado(String estado) {
    switch (estado) {
      case 'Abierta': return AppTheme.success;
      case 'Cuadrada': return AppTheme.primary;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.cajasDelDia)),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: TextStyle(color: Colors.grey.shade600)))
                : _cajas.isEmpty
                    ? LayoutBuilder(
                        builder: (_, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(child: Text(l10n.sinCajasHoy)),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _cajas.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final c = _cajas[i];
                          final cobrador = c['cobrador'] as Map<String, dynamic>?;
                          final ruta = c['ruta'] as Map<String, dynamic>?;
                          final estado = c['estado'] as String? ?? '';
                          return Card(
                            child: ListTile(
                              title: Text(
                                cobrador != null ? '${cobrador['nombre']} ${cobrador['apellido']}' : '—',
                              ),
                              subtitle: Text(
                                '${ruta?['nombre'] ?? '—'}  ·  $simbolo ${(c['total_cobros'] as num? ?? 0).toStringAsFixed(2)} ${l10n.totalCobros.toLowerCase()}',
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _colorEstado(estado).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  estado,
                                  style: TextStyle(color: _colorEstado(estado), fontWeight: FontWeight.w600, fontSize: 12),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
