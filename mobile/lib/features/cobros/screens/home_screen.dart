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

// Misma paleta que el sidebar del panel web (frontend/src/components/Layout/Sidebar.tsx)
const _sidebarBg = Color(0xFF0F172A);

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
        backgroundColor: _sidebarBg,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primary, AppTheme.secondary],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Text('OC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('OCA Ruta', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                          Text(rolEtiqueta, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFF1E293B)),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    // Mismo orden que el sidebar web (frontend/src/components/Layout/Sidebar.tsx):
                    // Dashboard, Nuevo cliente, Mi ruta, Cajas/Cobros, Empleados, Buró,
                    // Reportes, Config — con los mismos roles habilitados por ítem.
                    if (esAdmin)
                      _DrawerItem(
                        icon: Icons.dashboard_outlined,
                        label: l10n.dashboardTitulo,
                        onTap: () { Navigator.pop(context); context.push('/dashboard'); },
                      ),
                    // El cobrador tambien da de alta clientes puerta a puerta.
                    _DrawerItem(
                      icon: Icons.person_add_alt_outlined,
                      label: l10n.clienteNuevoTitulo,
                      onTap: () { Navigator.pop(context); context.push('/cliente-nuevo'); },
                    ),
                    _DrawerItem(
                      icon: Icons.map_outlined,
                      label: l10n.mapaTitulo,
                      onTap: () { Navigator.pop(context); context.push('/mapa'); },
                    ),
                    _DrawerItem(
                      icon: Icons.point_of_sale_outlined,
                      label: l10n.miCaja,
                      onTap: () { Navigator.pop(context); context.push('/caja'); },
                    ),
                    if (esAdminOSupervisor)
                      _DrawerItem(
                        icon: Icons.point_of_sale,
                        label: l10n.cajasDelDia,
                        onTap: () { Navigator.pop(context); context.push('/cajas-dia'); },
                      ),
                    if (esAdmin)
                      _DrawerItem(
                        icon: Icons.people_outline,
                        label: l10n.empleadosTitulo,
                        onTap: () { Navigator.pop(context); context.push('/empleados'); },
                      ),
                    _DrawerItem(
                      icon: Icons.shield_outlined,
                      label: l10n.buroCredito,
                      onTap: () { Navigator.pop(context); context.push('/buro'); },
                    ),
                    if (esAdmin)
                      _DrawerItem(
                        icon: Icons.bar_chart_outlined,
                        label: l10n.reportesTitulo,
                        onTap: () { Navigator.pop(context); context.push('/reportes'); },
                      ),
                    if (esAdmin)
                      _DrawerItem(
                        icon: Icons.settings_outlined,
                        label: l10n.configuracionTitulo,
                        onTap: () { Navigator.pop(context); context.push('/configuracion'); },
                      ),
                    const Divider(height: 24, color: Color(0xFF1E293B), indent: 20, endIndent: 20),
                    // Acciones propias de la app móvil, sin equivalente directo en la web.
                    _DrawerItem(
                      icon: Icons.report_gmailerrorred_outlined,
                      label: l10n.registrarNovedad,
                      onTap: () { Navigator.pop(context); context.push('/novedad'); },
                    ),
                    _DrawerItem(
                      icon: Icons.request_page_outlined,
                      label: l10n.nuevaSolicitud,
                      onTap: () { Navigator.pop(context); context.push('/nueva-solicitud'); },
                    ),
                    _DrawerItem(
                      icon: Icons.print_outlined,
                      label: l10n.impresoraTermica,
                      onTap: () { Navigator.pop(context); context.push('/impresora'); },
                    ),
                    if (esAdmin)
                      _DrawerItem(
                        icon: Icons.playlist_add_check_outlined,
                        label: l10n.solicitudesPendientes,
                        onTap: () { Navigator.pop(context); context.push('/solicitudes'); },
                      ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFF1E293B)),
              _DrawerItem(
                icon: Icons.logout,
                label: l10n.cerrarSesion,
                color: AppTheme.danger,
                onTap: () async {
                  Navigator.pop(context);
                  SyncService.instance.stopListening();
                  await ref.read(authStateProvider.notifier).logout();
                },
              ),
              const SizedBox(height: 8),
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

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  const _DrawerItem({required this.icon, required this.label, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final fg = color ?? const Color(0xFFCBD5E1);
    return ListTile(
      leading: Icon(icon, color: fg, size: 21),
      title: Text(label, style: TextStyle(color: fg, fontSize: 14)),
      dense: true,
      onTap: onTap,
    );
  }
}
