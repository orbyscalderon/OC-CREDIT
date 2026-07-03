import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  static const String _baseUrl = 'https://api.ocmoongroup.com/api/v1';
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
      LogInterceptor(requestBody: false, responseBody: false),
    ]);

  Dio get dio => _dio;

  Future<void> saveToken(String token) =>
      _storage.write(key: 'jwt', value: token);

  Future<void> deleteToken() => _storage.delete(key: 'jwt');

  Future<String?> getToken() => _storage.read(key: 'jwt');
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
