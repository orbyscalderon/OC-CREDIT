import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/constants/roles.dart';
import '../../../providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class EmpleadosScreen extends ConsumerStatefulWidget {
  const EmpleadosScreen({super.key});
  @override
  ConsumerState<EmpleadosScreen> createState() => _EmpleadosScreenState();
}

class _EmpleadosScreenState extends ConsumerState<EmpleadosScreen> {
  List<Map<String, dynamic>> _empleados = [];
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
      final resp = await ApiClient.instance.dio.get('/usuarios');
      final data = resp.data as List;
      setState(() {
        _empleados = data.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
        _loading = false;
      });
    }
  }

  Future<void> _toggleActivo(Map<String, dynamic> emp) async {
    final l10n = AppLocalizations.of(context)!;
    final activar = emp['activo'] != true;
    final confirmado = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(activar ? l10n.activarEmpleado : l10n.desactivarEmpleado),
        content: Text('${emp['nombre']} ${emp['apellido']}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancelar)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l10n.confirmar)),
        ],
      ),
    );
    if (confirmado != true) return;

    try {
      await ApiClient.instance.dio.patch('/usuarios/${emp['id']}/activo', data: {'activo': activar});
      _cargar();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorNoSePudoCompletarOperacion)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final esAdmin = ref.watch(authStateProvider).rol == 'admin_tenant';

    return Scaffold(
      appBar: AppBar(title: Text(l10n.empleadosTitulo)),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: TextStyle(color: Colors.grey.shade600)))
                : _empleados.isEmpty
                    ? LayoutBuilder(
                        builder: (_, constraints) => SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(child: Text(l10n.sinResultados)),
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _empleados.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final e = _empleados[i];
                          final activo = e['activo'] == true;
                          return Card(
                            child: ListTile(
                              title: Text('${e['nombre']} ${e['apellido']}'),
                              subtitle: Text('${e['email'] ?? ''}\n${etiquetaRol(e['rol'] as String?)}'),
                              isThreeLine: true,
                              trailing: esAdmin
                                  ? IconButton(
                                      icon: Icon(
                                        activo ? Icons.toggle_on : Icons.toggle_off,
                                        color: activo ? AppTheme.success : Colors.grey,
                                        size: 32,
                                      ),
                                      onPressed: () => _toggleActivo(e),
                                    )
                                  : Icon(
                                      activo ? Icons.check_circle : Icons.cancel,
                                      color: activo ? AppTheme.success : AppTheme.danger,
                                      size: 20,
                                    ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
