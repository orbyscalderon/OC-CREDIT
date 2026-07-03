import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  DatabaseHelper._internal();
  static final DatabaseHelper instance = DatabaseHelper._internal();

  Database? _db;

  Future<Database> get database async {
    _db ??= await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    return openDatabase(
      join(dbPath, 'oc_credit_local.db'),
      version: 3,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE prestamos_cache (
        id TEXT PRIMARY KEY,
        cliente_nombre TEXT NOT NULL,
        cliente_cedula TEXT NOT NULL,
        capital_aprobado REAL NOT NULL,
        cuota_monto REAL NOT NULL,
        num_cuotas INTEGER NOT NULL,
        cuotas_pagadas INTEGER NOT NULL DEFAULT 0,
        modalidad TEXT NOT NULL,
        estado TEXT NOT NULL,
        tiene_mora INTEGER NOT NULL DEFAULT 0,
        monto_mora REAL NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid_idempotencia TEXT NOT NULL UNIQUE,
        endpoint TEXT NOT NULL,
        payload TEXT NOT NULL,
        intentos INTEGER NOT NULL DEFAULT 0,
        ultimo_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE cobros_offline (
        uuid_idempotencia TEXT PRIMARY KEY,
        prestamo_id TEXT NOT NULL,
        monto_cobrado REAL NOT NULL,
        lat REAL,
        lng REAL,
        caja_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE novedades_offline (
        uuid_idempotencia TEXT PRIMARY KEY,
        ruta_id TEXT NOT NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        lat REAL,
        lng REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE INDEX idx_sync_queue_synced ON sync_queue(synced);
      CREATE INDEX idx_cobros_synced ON cobros_offline(synced);
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Idempotent migrations
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE prestamos_cache ADD COLUMN ruta_id TEXT');
    }
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE cobros_offline ADD COLUMN metodo_pago TEXT');
    }
  }

  Future<void> close() async => _db?.close();
}
