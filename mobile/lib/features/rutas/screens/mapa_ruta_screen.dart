import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' as ll;

import '../../../core/theme.dart';
import '../../../data/local/prestamos_cache_dao.dart';
import '../../../data/remote/api_client.dart';
import '../../../l10n/app_localizations.dart';

const _centroRD = ll.LatLng(18.4861, -69.9312);

class _ClienteUbicacion {
  final String id;
  final String nombre;
  final String apellido;
  final String? cedula;
  final String? direccion;
  final double lat;
  final double lng;

  _ClienteUbicacion({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.cedula,
    required this.direccion,
    required this.lat,
    required this.lng,
  });

  static _ClienteUbicacion? fromJson(Map<String, dynamic> j) {
    final lat = j['latitud_casa'];
    final lng = j['longitud_casa'];
    if (lat == null || lng == null) return null;
    return _ClienteUbicacion(
      id: j['id'] as String,
      nombre: (j['nombre'] as String?) ?? '',
      apellido: (j['apellido'] as String?) ?? '',
      cedula: j['cedula'] as String?,
      direccion: j['direccion_casa'] as String?,
      lat: (lat as num).toDouble(),
      lng: (lng as num).toDouble(),
    );
  }
}

class MapaRutaScreen extends ConsumerStatefulWidget {
  const MapaRutaScreen({super.key});
  @override
  ConsumerState<MapaRutaScreen> createState() => _MapaRutaScreenState();
}

class _MapaRutaScreenState extends ConsumerState<MapaRutaScreen> {
  final _mapController = MapController();
  List<String> _rutaIds = [];
  String? _rutaSeleccionada;
  List<_ClienteUbicacion> _clientes = [];
  ll.LatLng? _miUbicacion;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final prestamos = await PrestamoCacheDao().getAll();
    final rutaIds = prestamos
        .map((p) => p.rutaId)
        .whereType<String>()
        .toSet()
        .toList();

    if (rutaIds.isEmpty) {
      setState(() {
        _loading = false;
        _error = AppLocalizations.of(context)?.mapaSinPrestamos;
      });
      return;
    }

    setState(() {
      _rutaIds = rutaIds;
      _rutaSeleccionada = rutaIds.first;
    });

    unawaited(_cargarUbicacionActual());
    await _cargarClientes(rutaIds.first);
  }

  Future<void> _cargarUbicacionActual() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
      if (mounted) setState(() => _miUbicacion = ll.LatLng(pos.latitude, pos.longitude));
    } catch (_) {
      // Silencioso -- el mapa igual funciona sin la ubicación propia.
    }
  }

  Future<void> _cargarClientes(String rutaId) async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/clientes/ruta/$rutaId');
      final data = (resp.data as List).cast<Map<String, dynamic>>();
      final clientes = data
          .map(_ClienteUbicacion.fromJson)
          .whereType<_ClienteUbicacion>()
          .toList();
      setState(() {
        _clientes = clientes;
        _loading = false;
      });
      if (clientes.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _mapController.move(ll.LatLng(clientes.first.lat, clientes.first.lng), 13);
        });
      }
    } catch (_) {
      setState(() {
        _loading = false;
        _error = AppLocalizations.of(context)?.errorNoSePudoCompletarOperacion;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final centro = _clientes.isNotEmpty
        ? ll.LatLng(_clientes.first.lat, _clientes.first.lng)
        : (_miUbicacion ?? _centroRD);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.mapaTitulo),
        bottom: _rutaIds.length > 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(48),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: DropdownButton<String>(
                    value: _rutaSeleccionada,
                    isExpanded: true,
                    dropdownColor: AppTheme.primary,
                    style: const TextStyle(color: Colors.white),
                    underline: const SizedBox.shrink(),
                    items: _rutaIds
                        .map((id) => DropdownMenuItem(value: id, child: Text(id.substring(0, 8))))
                        .toList(),
                    onChanged: (v) {
                      if (v == null) return;
                      setState(() => _rutaSeleccionada = v);
                      _cargarClientes(v);
                    },
                  ),
                ),
              )
            : null,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.map_outlined, size: 48, color: Colors.grey),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                )
              : Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapController,
                      options: MapOptions(initialCenter: centro, initialZoom: 13),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.oca.credit.mobile',
                        ),
                        MarkerLayer(
                          markers: [
                            if (_miUbicacion != null)
                              Marker(
                                point: _miUbicacion!,
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.my_location, color: AppTheme.primary, size: 32),
                              ),
                            for (final c in _clientes)
                              Marker(
                                point: ll.LatLng(c.lat, c.lng),
                                width: 40,
                                height: 40,
                                child: GestureDetector(
                                  onTap: () => _mostrarInfoCliente(c),
                                  child: const Icon(Icons.location_on, color: AppTheme.danger, size: 38),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    if (_clientes.isEmpty)
                      Positioned(
                        top: 16, left: 16, right: 16,
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(l10n.mapaSinClientes, textAlign: TextAlign.center),
                          ),
                        ),
                      ),
                  ],
                ),
      floatingActionButton: _miUbicacion != null
          ? FloatingActionButton.small(
              onPressed: () => _mapController.move(_miUbicacion!, 15),
              tooltip: l10n.mapaMiUbicacion,
              child: const Icon(Icons.my_location),
            )
          : null,
    );
  }

  void _mostrarInfoCliente(_ClienteUbicacion c) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${c.nombre} ${c.apellido}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            if (c.cedula != null && c.cedula!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(c.cedula!, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              ),
            if (c.direccion != null && c.direccion!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(c.direccion!),
              ),
          ],
        ),
      ),
    );
  }
}
