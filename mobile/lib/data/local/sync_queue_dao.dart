import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'database_helper.dart';

class SyncQueueItem {
  final String uuidIdempotencia;
  final String endpoint;
  final Map<String, dynamic> payload;
  final int intentos;
  final String? ultimoError;
  final String createdAt;

  SyncQueueItem({
    required this.uuidIdempotencia,
    required this.endpoint,
    required this.payload,
    this.intentos = 0,
    this.ultimoError,
    required this.createdAt,
  });

  factory SyncQueueItem.fromMap(Map<String, dynamic> m) => SyncQueueItem(
        uuidIdempotencia: m['uuid_idempotencia'] as String,
        endpoint: m['endpoint'] as String,
        payload: jsonDecode(m['payload'] as String) as Map<String, dynamic>,
        intentos: m['intentos'] as int,
        ultimoError: m['ultimo_error'] as String?,
        createdAt: m['created_at'] as String,
      );
}

class SyncQueueDao {
  Future<Database> get _db => DatabaseHelper.instance.database;

  Future<void> enqueue(String uuid, String endpoint, Map<String, dynamic> payload) async {
    final db = await _db;
    await db.insert(
      'sync_queue',
      {
        'uuid_idempotencia': uuid,
        'endpoint': endpoint,
        'payload': jsonEncode(payload),
        'created_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.ignore, // idempotent
    );
  }

  Future<List<SyncQueueItem>> getPending({int limit = 20}) async {
    final db = await _db;
    final rows = await db.query(
      'sync_queue',
      where: 'synced = 0 AND intentos < 5',
      orderBy: 'created_at ASC',
      limit: limit,
    );
    return rows.map(SyncQueueItem.fromMap).toList();
  }

  Future<void> markSynced(String uuid) async {
    final db = await _db;
    await db.update(
      'sync_queue',
      {'synced': 1},
      where: 'uuid_idempotencia = ?',
      whereArgs: [uuid],
    );
  }

  Future<void> incrementRetry(String uuid, String error) async {
    final db = await _db;
    await db.rawUpdate(
      'UPDATE sync_queue SET intentos = intentos + 1, ultimo_error = ? WHERE uuid_idempotencia = ?',
      [error, uuid],
    );
  }

  Future<int> countPending() async {
    final db = await _db;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0',
    );
    return (result.first['cnt'] as int?) ?? 0;
  }
}
