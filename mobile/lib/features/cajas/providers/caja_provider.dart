import 'package:flutter/foundation.dart';
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
    final rutas = await ApiClient.instance.dio.get('/rutas/mis-rutas');
    final lista = rutas.data as List;
    if (lista.isEmpty) {
      throw Exception('No tienes una ruta activa asignada. Contacta a tu administrador.');
    }
    final rutaId = (lista.first as Map<String, dynamic>)['id'] as String;

    final resp = await ApiClient.instance.dio.post('/cajas/abrir', data: {
      'ruta_id': rutaId,
      'monto_apertura': 0,
    });
    state = CajaActiva.fromJson(resp.data as Map<String, dynamic>);
  }

  Future<void> cerrar(double montoDeclarado) async {
    if (state == null) return;
    await ApiClient.instance.dio.post('/cajas/cerrar', data: {
      'caja_id': state!.id,
      'monto_cierre_declarado': montoDeclarado,
    });
    state = null;
  }

  Future<void> loadActiva() async {
    try {
      final resp = await ApiClient.instance.dio.get('/cajas/activa');
      final list = resp.data as List;
      final abierta = list.firstWhere(
        (c) => (c as Map<String, dynamic>)['estado'] == 'Abierta',
        orElse: () => null,
      );
      if (abierta != null) {
        state = CajaActiva.fromJson(abierta as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('CajaNotifier.loadActiva() falló: $e');
    }
  }
}

final cajaActivaProvider = StateNotifierProvider<CajaNotifier, CajaActiva?>(
  (_) => CajaNotifier()..loadActiva(),
);
