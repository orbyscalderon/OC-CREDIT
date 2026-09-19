import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/registro_negocio_screen.dart';
import '../features/cobros/screens/home_screen.dart';
import '../features/cobros/screens/registrar_cobro_screen.dart';
import '../features/cajas/screens/caja_screen.dart';
import '../features/cajas/screens/cajas_dia_screen.dart';
import '../features/buro/screens/buro_consulta_screen.dart';
import '../features/novedades/screens/novedad_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/prestamos/screens/solicitudes_screen.dart';
import '../features/prestamos/screens/nueva_solicitud_screen.dart';
import '../features/empleados/screens/empleados_screen.dart';
import '../features/clientes/screens/cliente_nuevo_screen.dart';
import '../providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLogged = authState.isAuthenticated;
      final isPublicRoute = state.matchedLocation == '/login' || state.matchedLocation == '/registro';
      if (!isLogged && !isPublicRoute) return '/login';
      if (isLogged && isPublicRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/registro', builder: (_, __) => const RegistroNegocioScreen()),
      GoRoute(path: '/home',   builder: (_, __) => const HomeScreen()),
      GoRoute(
        path: '/cobro/:prestamoId',
        builder: (_, state) =>
            RegistrarCobroScreen(prestamoId: state.pathParameters['prestamoId']!),
      ),
      GoRoute(path: '/caja',     builder: (_, __) => const CajaScreen()),
      GoRoute(path: '/buro',     builder: (_, __) => const BuroConsultaScreen()),
      GoRoute(path: '/novedad',  builder: (_, __) => const NovedadScreen()),
      GoRoute(path: '/dashboard',   builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/solicitudes', builder: (_, __) => const SolicitudesScreen()),
      GoRoute(path: '/nueva-solicitud', builder: (_, __) => const NuevaSolicitudScreen()),
      GoRoute(path: '/empleados',   builder: (_, __) => const EmpleadosScreen()),
      GoRoute(path: '/cajas-dia',   builder: (_, __) => const CajasDiaScreen()),
      GoRoute(path: '/cliente-nuevo', builder: (_, __) => const ClienteNuevoScreen()),
    ],
  );
});
