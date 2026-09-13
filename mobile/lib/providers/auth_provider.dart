import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/remote/api_client.dart';

class AuthState {
  final String? token;
  final String? rol;
  final bool isAuthenticated;

  const AuthState({this.token, this.rol, this.isAuthenticated = false});
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await ApiClient.instance.getToken();
    if (token != null && token.isNotEmpty) {
      state = AuthState(token: token, isAuthenticated: true);
    }
  }

  /// Devuelve `null` si el login fue exitoso, o un mensaje de error legible
  /// para el usuario en caso contrario (distingue credenciales invalidas de
  /// fallas de red/servidor en vez de mostrar siempre el mismo mensaje).
  Future<String?> login(String email, String password) async {
    try {
      final resp = await ApiClient.instance.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = resp.data['access_token'] as String;
      final rol = resp.data['usuario']['rol'] as String;
      await ApiClient.instance.saveToken(token);
      state = AuthState(token: token, rol: rol, isAuthenticated: true);
      return null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final data = e.response?.data;
        if (data is Map && data['error'] is String) return data['error'] as String;
        return 'Credenciales inválidas';
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError) {
        return 'No se pudo conectar al servidor. Verifica tu conexión.';
      }
      return 'Ocurrió un error inesperado. Intenta de nuevo.';
    } catch (_) {
      return 'Ocurrió un error inesperado. Intenta de nuevo.';
    }
  }

  Future<void> logout() async {
    await ApiClient.instance.deleteToken();
    state = const AuthState();
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);
