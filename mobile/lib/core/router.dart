import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/screens/login_screen.dart';
import '../features/cobros/screens/home_screen.dart';
import '../features/cobros/screens/registrar_cobro_screen.dart';
import '../features/cajas/screens/caja_screen.dart';
import '../features/buro/screens/buro_consulta_screen.dart';
import '../features/novedades/screens/novedad_screen.dart';
import '../providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLogged = authState.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';
      if (!isLogged && !isLoginRoute) return '/login';
      if (isLogged && isLoginRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login',  builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/home',   builder: (_, __) => const HomeScreen()),
      GoRoute(
        path: '/cobro/:prestamoId',
        builder: (_, state) =>
            RegistrarCobroScreen(prestamoId: state.pathParameters['prestamoId']!),
      ),
      GoRoute(path: '/caja',     builder: (_, __) => const CajaScreen()),
      GoRoute(path: '/buro',     builder: (_, __) => const BuroConsultaScreen()),
      GoRoute(path: '/novedad',  builder: (_, __) => const NovedadScreen()),
    ],
  );
});
