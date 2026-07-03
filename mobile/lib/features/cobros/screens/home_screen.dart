import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/services/sync_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis cobros del día'),
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
                  tooltip: 'Sincronizar pendientes',
                ),
              ),
            ),
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'caja') context.push('/caja');
              if (v == 'buro') context.push('/buro');
              if (v == 'novedad') context.push('/novedad');
              if (v == 'logout') {
                SyncService.instance.stopListening();
                await ref.read(authStateProvider.notifier).logout();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'caja', child: Text('Mi caja')),
              const PopupMenuItem(value: 'buro', child: Text('Buró de crédito')),
              const PopupMenuItem(value: 'novedad', child: Text('Registrar novedad')),
              const PopupMenuItem(value: 'logout', child: Text('Cerrar sesión')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra búsqueda
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Buscar cliente o cédula…',
                prefixIcon: Icon(Icons.search),
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
                    Text('Sin conexión — mostrando cache',
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

                if (filtrada.isEmpty) {
                  return const Center(child: Text('Sin resultados'));
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(prestamosProvider);
                    await _loadPendingCount();
                  },
                  child: ListView.separated(
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
