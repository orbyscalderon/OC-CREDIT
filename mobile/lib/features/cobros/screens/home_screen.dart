import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/services/sync_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme.dart';
import '../../../core/constants/roles.dart';
import '../../../l10n/app_localizations.dart';
import '../widgets/prestamo_card.dart';

final prestamosProvider = FutureProvider<List<PrestamoCache>>((ref) async {
  await SyncService.instance.refreshCache();
  return PrestamoCacheDao().getAll();
});

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _q = '';
  int _pendingSync = 0;

  @override
  void initState() {
    super.initState();
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    final n = await SyncService.instance.pendingCount();
    if (mounted) setState(() => _pendingSync = n);
  }

  @override
  Widget build(BuildContext context) {
    final prestamosAsync = ref.watch(prestamosProvider);
    final l10n = AppLocalizations.of(context)!;
    final rol = ref.watch(authStateProvider).rol;
    final rolEtiqueta = etiquetaRol(rol);
    final esAdmin = rol == 'admin_tenant';
    final esAdminOSupervisor = esAdmin || rol == 'supervisor_tenant';

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.misCobrosDelDia),
        actions: [
          if (_pendingSync > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Badge(
                label: Text('$_pendingSync'),
                child: IconButton(
                  icon: const Icon(Icons.sync),
                  onPressed: () async {
                    await SyncService.instance.syncNow();
                    await _loadPendingCount();
                    ref.invalidate(prestamosProvider);
                  },
                  tooltip: l10n.sincronizarPendientes,
                ),
              ),
            ),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DrawerHeader(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    const Icon(Icons.account_circle, size: 48, color: AppTheme.primary),
                    const SizedBox(height: 8),
                    const Text('OCA Credit', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(rolEtiqueta, style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              ListTile(
                leading: const Icon(Icons.point_of_sale_outlined),
                title: Text(l10n.miCaja),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/caja');
                },
              ),
              ListTile(
                leading: const Icon(Icons.shield_outlined),
                title: Text(l10n.buroCredito),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/buro');
                },
              ),
              ListTile(
                leading: const Icon(Icons.report_gmailerrorred_outlined),
                title: Text(l10n.registrarNovedad),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/novedad');
                },
              ),
              ListTile(
                leading: const Icon(Icons.request_page_outlined),
                title: Text(l10n.nuevaSolicitud),
                onTap: () {
                  Navigator.pop(context);
                  context.push('/nueva-solicitud');
                },
              ),
              if (esAdmin) ...[
                ListTile(
                  leading: const Icon(Icons.dashboard_outlined),
                  title: Text(l10n.dashboardTitulo),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/dashboard');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.playlist_add_check_outlined),
                  title: Text(l10n.solicitudesPendientes),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/solicitudes');
                  },
                ),
              ],
              if (esAdminOSupervisor) ...[
                ListTile(
                  leading: const Icon(Icons.people_outline),
                  title: Text(l10n.empleadosTitulo),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/empleados');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.point_of_sale),
                  title: Text(l10n.cajasDelDia),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/cajas-dia');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.person_add_alt_outlined),
                  title: Text(l10n.clienteNuevoTitulo),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/cliente-nuevo');
                  },
                ),
              ],
              const Spacer(),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout, color: AppTheme.danger),
                title: Text(l10n.cerrarSesion, style: const TextStyle(color: AppTheme.danger)),
                onTap: () async {
                  Navigator.pop(context);
                  SyncService.instance.stopListening();
                  await ref.read(authStateProvider.notifier).logout();
                },
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Barra búsqueda
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: l10n.buscarClienteCedula,
                prefixIcon: const Icon(Icons.search),
                isDense: true,
              ),
              onChanged: (v) => setState(() => _q = v.toLowerCase()),
            ),
          ),

          // Lista de préstamos
          Expanded(
            child: prestamosAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                    const SizedBox(height: 12),
                    Text(l10n.sinConexionCache,
                        style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
              data: (lista) {
                final filtrada = _q.isEmpty
                    ? lista
                    : lista
                        .where((p) =>
                            p.clienteNombre.toLowerCase().contains(_q) ||
                            p.clienteCedula.contains(_q))
                        .toList();

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(prestamosProvider);
                    await _loadPendingCount();
                  },
                  child: filtrada.isEmpty
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
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                          itemCount: filtrada.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) => PrestamoCard(
                            prestamo: filtrada[i],
                            onTap: () => context.push('/cobro/${filtrada[i].id}'),
                          ),
                        ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
