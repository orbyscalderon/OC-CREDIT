import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/remote/api_client.dart';

class TenantConfig {
  final String pais;
  final String moneda;
  final String simboloMoneda;
  final String zonaHoraria;
  final String formatoFecha;
  final String nombreEmpresa;
  final String? textoPieRecibo;

  const TenantConfig({
    this.pais = 'DO',
    this.moneda = 'DOP',
    this.simboloMoneda = 'RD\$',
    this.zonaHoraria = 'America/Santo_Domingo',
    this.formatoFecha = 'DD/MM/YYYY',
    this.nombreEmpresa = 'OCA Ruta',
    this.textoPieRecibo,
  });

  factory TenantConfig.fromJson(Map<String, dynamic> json) => TenantConfig(
        pais: json['pais'] as String? ?? 'DO',
        moneda: json['moneda'] as String? ?? 'DOP',
        simboloMoneda: json['simbolo_moneda'] as String? ?? 'RD\$',
        zonaHoraria: json['zona_horaria'] as String? ?? 'America/Santo_Domingo',
        formatoFecha: json['formato_fecha'] as String? ?? 'DD/MM/YYYY',
        nombreEmpresa: json['nombre_empresa'] as String? ?? 'OCA Ruta',
        textoPieRecibo: json['texto_pie_recibo'] as String?,
      );
}

class AuthState {
  final String? token;
  final String? rol;
  final bool isAuthenticated;
  final TenantConfig tenantConfig;

  const AuthState({
    this.token,
    this.rol,
    this.isAuthenticated = false,
    this.tenantConfig = const TenantConfig(),
  });
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) {
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await ApiClient.instance.getToken();
    if (token == null || token.isEmpty) return;

    // rol/tenantConfig no se persisten localmente — sin esto, reabrir la app
    // (en vez de hacer login de nuevo) dejaba rol=null y ocultaba en
    // silencio todo el menú condicionado por rol (Dashboard, Solicitudes,
    // Empleados, Cajas del día para admin/supervisor).
    state = AuthState(token: token, isAuthenticated: true);
    try {
      final resp = await ApiClient.instance.dio.get('/auth/me');
      final data = resp.data as Map<String, dynamic>;
      final rol = data['usuario']['rol'] as String?;
      final tenantConfigJson = data['tenant_config'] as Map<String, dynamic>?;
      state = AuthState(
        token: token,
        rol: rol,
        isAuthenticated: true,
        tenantConfig: tenantConfigJson != null ? TenantConfig.fromJson(tenantConfigJson) : const TenantConfig(),
      );
    } catch (_) {
      // Sin red al abrir la app: se sigue con isAuthenticated=true y
      // rol=null (el home offline con cache funciona igual; el menú de
      // administración simplemente no aparece hasta recuperar conexión).
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
      return await _aplicarRespuestaLogin(resp.data as Map<String, dynamic>);
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

  /// [idToken] es el ID token de Google (verificado por el backend contra
  /// GOOGLE_CLIENT_ID) — el mismo flujo que usa el panel web.
  Future<String?> loginWithGoogle(String idToken) async {
    try {
      final resp = await ApiClient.instance.dio.post('/auth/google', data: {
        'credential': idToken,
      });
      return await _aplicarRespuestaLogin(resp.data as Map<String, dynamic>);
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['error'] is String) return data['error'] as String;
      if (data is Map && data['details'] is Map && data['details']['message'] is String) {
        return data['details']['message'] as String;
      }
      return 'No se pudo iniciar sesión con Google.';
    } catch (_) {
      return 'No se pudo iniciar sesión con Google.';
    }
  }

  /// Común a login() y loginWithGoogle(). Cualquier rol del tenant puede
  /// entrar (admin/supervisor incluidos) — admin/supervisor ya pueden cobrar
  /// en nombre de cualquier cobrador desde el panel web ("Cobro Manual"), así
  /// que verlo también desde el móvil es consistente, no un caso roto.
  Future<String?> _aplicarRespuestaLogin(Map<String, dynamic> data) async {
    final token = data['access_token'] as String;
    final rol = data['usuario']['rol'] as String;

    final tenantConfigJson = data['tenant_config'] as Map<String, dynamic>?;
    final tenantConfig = tenantConfigJson != null
        ? TenantConfig.fromJson(tenantConfigJson)
        : const TenantConfig();
    await ApiClient.instance.saveToken(token);
    state = AuthState(
      token: token,
      rol: rol,
      isAuthenticated: true,
      tenantConfig: tenantConfig,
    );
    return null;
  }

  Future<void> logout() async {
    await ApiClient.instance.deleteToken();
    state = const AuthState();
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (_) => AuthNotifier(),
);
