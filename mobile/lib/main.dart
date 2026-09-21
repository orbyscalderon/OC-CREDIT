import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:safe_device/safe_device.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'data/local/database_helper.dart';
import 'l10n/app_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Abort on rooted/emulated device — solo en release (en debug este chequeo
  // bloquearía cualquier prueba en desarrollo). No se bloquea por "modo
  // desarrollador" activado: muchos usuarios reales lo tienen encendido por
  // motivos ajenos a seguridad (otra app, ajustes del teléfono), y bloquearlos
  // a ellos también sería más dañino que el riesgo que se busca evitar.
  if (kReleaseMode) {
    final bool jailbroken = await SafeDevice.isJailBroken;
    final bool isRealDevice = await SafeDevice.isRealDevice;
    if (jailbroken || !isRealDevice) {
      runApp(const _BlockedApp());
      return;
    }
  }

  await DatabaseHelper.instance.database; // warm up SQLite
  runApp(const ProviderScope(child: OcCreditApp()));
}

class OcCreditApp extends ConsumerWidget {
  const OcCreditApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'OCA Ruta',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}

class _BlockedApp extends StatelessWidget {
  const _BlockedApp();
  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'Dispositivo no permitido.\nEsta aplicación no puede ejecutarse en dispositivos con root, jailbreak o en emuladores.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
          ),
        ),
      ),
    );
  }
}
