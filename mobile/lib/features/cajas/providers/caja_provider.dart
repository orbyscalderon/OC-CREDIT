import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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

  Map<String, dynamic> toJson() => {
    'id': id,
    'estado': estado,
    'total_cobros': totalCobros,
    'total_gastos': totalGastos,
  };
}

class CajaNotifier extends StateNotifier<CajaActiva?> {
  CajaNotifier() : super(null) {
    _listo = _iniciar();
  }

  static const _storage = FlutterSecureStorage();
  static const _kCajaCache = 'caja_activa_cache';

  // Riverpod construye este notifier de forma perezosa, recién en el primer
  // ref.read/watch -- si esa primera lectura ocurre en el propio botón de
  // "Confirmar cobro" (cobrador que nunca pasó por "Mi caja" en la sesión),
  // el chequeo síncrono de cajaId corre ANTES de que _iniciar() termine de
  // leer el cache/red, y bloquea el cobro por una carrera, no porque la
  // caja esté realmente cerrada. Los llamadores deben esperar este future
  // antes de leer el state.
  late final Future<void> _listo;
  Future<void> get listo => _listo;

  // El estado de la caja abierta vivía solo en memoria: si el cobrador abría
  // caja con señal y luego se quedaba sin red (el caso de uso central del
  // offline-first), loadActiva() fallaba en silencio y el state quedaba en
  // null para siempre -- "Registrar cobro" bloqueaba TODO cobro con "Debes
  // abrir una caja primero" pese a que la caja sí estaba abierta. Se
  // persiste localmente para que sobreviva sin red y a un reinicio de la app.
  Future<void> _iniciar() async {
    try {
      final raw = await _storage.read(key: _kCajaCache);
      if (raw != null) {
        state = CajaActiva.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      }
    } catch (_) {}
    await loadActiva();
  }

  Future<void> _guardarCache(CajaActiva? caja) async {
    try {
      if (caja == null) {
        await _storage.delete(key: _kCajaCache);
      } else {
        await _storage.write(key: _kCajaCache, value: jsonEncode(caja.toJson()));
      }
    } catch (_) {}
  }

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
    await _guardarCache(state);
  }

  Future<void> cerrar(double montoDeclarado) async {
    if (state == null) return;
    await ApiClient.instance.dio.post('/cajas/cerrar', data: {
      'caja_id': state!.id,
      'monto_cierre_declarado': montoDeclarado,
    });
    state = null;
    await _guardarCache(null);
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
        await _guardarCache(state);
      } else {
        // El server confirma que no hay caja abierta -- a diferencia de un
        // fallo de red, esto sí debe limpiar el cache local (por ej. si se
        // cerró la caja desde el panel web).
        state = null;
        await _guardarCache(null);
      }
    } catch (e) {
      // Sin conexión: se conserva lo que ya se cargó del cache local en
      // _iniciar() en vez de pisarlo con null.
      debugPrint('CajaNotifier.loadActiva() falló: $e');
    }
  }
}

final cajaActivaProvider = StateNotifierProvider<CajaNotifier, CajaActiva?>(
  (_) => CajaNotifier()..loadActiva(),
);
