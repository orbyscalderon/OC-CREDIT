import 'package:sqflite/sqflite.dart';
import 'database_helper.dart';

class PrestamoCache {
  final String id;
  final String clienteNombre;
  final String clienteCedula;
  final double capitalAprobado;
  final double cuotaMonto;
  final int numCuotas;
  final int cuotasPagadas;
  final String modalidad;
  final String estado;
  final bool tieneMora;
  final double montoMora;
  final String? rutaId;

  const PrestamoCache({
    required this.id,
    required this.clienteNombre,
    required this.clienteCedula,
    required this.capitalAprobado,
    required this.cuotaMonto,
    required this.numCuotas,
    required this.cuotasPagadas,
    required this.modalidad,
    required this.estado,
    required this.tieneMora,
    required this.montoMora,
    this.rutaId,
  });

  factory PrestamoCache.fromMap(Map<String, dynamic> m) => PrestamoCache(
        id: m['id'] as String,
        clienteNombre: m['cliente_nombre'] as String,
        clienteCedula: m['cliente_cedula'] as String,
        capitalAprobado: (m['capital_aprobado'] as num).toDouble(),
        cuotaMonto: (m['cuota_monto'] as num).toDouble(),
        numCuotas: m['num_cuotas'] as int,
        cuotasPagadas: m['cuotas_pagadas'] as int,
        modalidad: m['modalidad'] as String,
        estado: m['estado'] as String,
        tieneMora: (m['tiene_mora'] as int) == 1,
        montoMora: (m['monto_mora'] as num).toDouble(),
        rutaId: m['ruta_id'] as String?,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'cliente_nombre': clienteNombre,
        'cliente_cedula': clienteCedula,
        'capital_aprobado': capitalAprobado,
        'cuota_monto': cuotaMonto,
        'num_cuotas': numCuotas,
        'cuotas_pagadas': cuotasPagadas,
        'modalidad': modalidad,
        'estado': estado,
        'tiene_mora': tieneMora ? 1 : 0,
        'monto_mora': montoMora,
        'ruta_id': rutaId,
        'synced_at': DateTime.now().toIso8601String(),
      };
}

class PrestamoCacheDao {
  Future<Database> get _db => DatabaseHelper.instance.database;

  Future<void> upsertAll(List<PrestamoCache> items) async {
    final db = await _db;
    final batch = db.batch();
    for (final item in items) {
      batch.insert('prestamos_cache', item.toMap(),
          conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<List<PrestamoCache>> getAll({String? rutaId}) async {
    final db = await _db;
    final rows = await db.query(
      'prestamos_cache',
      where: rutaId != null ? 'ruta_id = ?' : null,
      whereArgs: rutaId != null ? [rutaId] : null,
      orderBy: 'cliente_nombre ASC',
    );
    return rows.map(PrestamoCache.fromMap).toList();
  }

  Future<PrestamoCache?> getById(String id) async {
    final db = await _db;
    final rows = await db.query('prestamos_cache', where: 'id = ?', whereArgs: [id], limit: 1);
    return rows.isEmpty ? null : PrestamoCache.fromMap(rows.first);
  }

  Future<void> clear() async {
    final db = await _db;
    await db.delete('prestamos_cache');
  }
}
