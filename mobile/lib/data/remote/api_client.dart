import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  // En debug usa localhost + `adb reverse tcp:4000 tcp:4000`: el trafico
  // viaja por el cable USB hacia el backend de la PC, evitando por completo
  // los problemas de NAT/firewall del Hotspot movil de Windows.
  // Si pruebas en un emulador (no dispositivo fisico via USB), cambia esto
  // por 'http://10.0.2.2:4000/api/v1'.
  static const String _baseUrl = kReleaseMode
      ? 'https://api.ocmoongroup.com/api/v1'
      : 'http://127.0.0.1:4000/api/v1';
  static const _storage = FlutterSecureStorage();

  late final Dio _dio = Dio(
    BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ),
  )..interceptors.addAll([
      _AuthInterceptor(_storage),
      _UnwrapInterceptor(),
      LogInterceptor(requestBody: false, responseBody: false),
    ]);

  Dio get dio => _dio;

  Future<void> saveToken(String token) =>
      _storage.write(key: 'jwt', value: token);

  Future<void> deleteToken() => _storage.delete(key: 'jwt');

  Future<String?> getToken() => _storage.read(key: 'jwt');
}

// El backend envuelve TODAS las respuestas como {success, data, timestamp}
// (ver TransformInterceptor global en el backend). El panel web lo desenvuelve
// en su cliente axios; aqui se hace lo mismo para que el resto del codigo de
// la app trabaje directo con el payload real, sin ['data'] de por medio.
class _UnwrapInterceptor extends Interceptor {
  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final body = response.data;
    if (body is Map && body.containsKey('success') && body.containsKey('data')) {
      response.data = body['data'];
    }
    handler.next(response);
  }
}

class _AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  const _AuthInterceptor(this._storage);

  @override
  Future<void> onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: 'jwt');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      _storage.delete(key: 'jwt');
    }
    handler.next(err);
  }
}
