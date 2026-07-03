import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/remote/api_client.dart';

class CajaActiva {
  final String id;
  final String estado;
  final double totalCobros;
  final double totalGastos;
  CajaActiva({required this.id, required this.estado, required this.totalCobros, required this.totalGastos});

  factory CajaActiva.fromJson(Map<String, dynamic> j) => CajaActiva(
    id: j['id'] as String,
    estado: j['estado'] as String,
    totalCobros: (j['total_cobros'] as num).toDouble(),
    totalGastos: (j['total_gastos'] as num).toDouble(),
  );
}

class CajaNotifier extends StateNotifier<CajaActiva?> {
  CajaNotifier() : super(null);

  Future<void> abrir() async {
    final resp = await ApiClient.instance.dio.post('/cajas/abrir', data: {'monto_apertura': 0});
    state = CajaActiva.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> cerrar(double montoDeclarado) async {
    if (state == null) return;
    await ApiClient.instance.dio.post('/cajas/${state!.id}/cerrar', data: {
      'monto_cierre_declarado': montoDeclarado,
    });
    state = null;
  }

  Future<void> loadActiva() async {
    try {
      final resp = await ApiClient.instance.dio.get('/cajas/hoy');
      final list = resp.data as List;
      final abierta = list.firstWhere(
        (c) => (c as Map<String, dynamic>)['estado'] == 'Abierta',
        orElse: () => null,
      );
      if (abierta != null) {
        state = CajaActiva.fromJson(abierta as Map<String, dynamic>);
      }
    } catch (_) {}
  }
}

final cajaActivaProvider = StateNotifierProvider<CajaNotifier, CajaActiva?>(
  (_) => CajaNotifier()..loadActiva(),
);
