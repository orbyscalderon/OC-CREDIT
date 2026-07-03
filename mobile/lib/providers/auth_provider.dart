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

  Future<bool> login(String email, String password) async {
    try {
      final resp = await ApiClient.instance.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final token = resp.data['access_token'] as String;
      final rol = resp.data['rol'] as String;
      await ApiClient.instance.saveToken(token);
      state = AuthState(token: token, rol: rol, isAuthenticated: true);
      return true;
    } catch (_) {
      return false;
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
