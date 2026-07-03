import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

import '../local/sync_queue_dao.dart';
import '../local/prestamos_cache_dao.dart';
import '../remote/api_client.dart';

/// SyncService: drena la sync_queue cuando hay conectividad.
/// Se llama al iniciar la app y cada vez que se recupera la red.
class SyncService {
  SyncService._internal();
  static final SyncService instance = SyncService._internal();

  final _queueDao = SyncQueueDao();
  final _cacheDao = PrestamoCacheDao();
  final _dio = ApiClient.instance.dio;

  StreamSubscription<List<ConnectivityResult>>? _sub;

  void startListening() {
    _sub = Connectivity()
        .onConnectivityChanged
        .listen((results) {
      final hasNetwork = results.any((r) => r != ConnectivityResult.none);
      if (hasNetwork) _drainQueue();
    });
  }

  void stopListening() => _sub?.cancel();

  /// Intenta sincronizar hasta 50 items pendientes en orden FIFO.
  Future<SyncResult> _drainQueue() async {
    final pending = await _queueDao.getPending(limit: 50);
    int ok = 0;
    int fail = 0;

    for (final item in pending) {
      try {
        await _dio.post(item.endpoint, data: item.payload);
        await _queueDao.markSynced(item.uuidIdempotencia);
        ok++;
      } on DioException catch (e) {
        final statusCode = e.response?.statusCode ?? 0;
        // 409 = duplicate UUID → ya procesado en servidor, marcar como synced
        if (statusCode == 409) {
          await _queueDao.markSynced(item.uuidIdempotencia);
          ok++;
        } else {
          await _queueDao.incrementRetry(
            item.uuidIdempotencia,
            e.message ?? 'Error desconocido',
          );
          fail++;
        }
      }
    }

    return SyncResult(synced: ok, failed: fail);
  }

  Future<SyncResult> syncNow() => _drainQueue();

  /// Descarga la lista de préstamos activos del cobrador y actualiza el cache local.
  Future<void> refreshCache() async {
    try {
      final response = await _dio.get('/prestamos', queryParameters: {
        'estado': 'Activo',
        'limit': 200,
      });
      final items = (response.data['data'] as List)
          .map((json) => PrestamoCache(
                id: json['id'] as String,
                clienteNombre: '${json['cliente']?['nombre'] ?? ''} ${json['cliente']?['apellido'] ?? ''}'.trim(),
                clienteCedula: json['cliente']?['cedula'] as String? ?? '',
                capitalAprobado: (json['capital_aprobado'] as num).toDouble(),
                cuotaMonto: (json['cuota_monto'] as num? ?? 0).toDouble(),
                numCuotas: json['num_cuotas'] as int,
                cuotasPagadas: json['cuotas_pagadas'] as int? ?? 0,
                modalidad: json['modalidad'] as String,
                estado: json['estado'] as String,
                tieneMora: (json['tiene_mora'] as bool?) ?? false,
                montoMora: (json['monto_mora'] as num? ?? 0).toDouble(),
                rutaId: json['ruta_id'] as String?,
              ))
          .toList();
      await _cacheDao.upsertAll(items);
    } catch (_) {
      // Red sin disponibilidad — usamos cache existente
    }
  }

  Future<int> pendingCount() => _queueDao.countPending();
}

class SyncResult {
  final int synced;
  final int failed;
  const SyncResult({required this.synced, required this.failed});
}
