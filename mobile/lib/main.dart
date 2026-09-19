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

  // Abort on rooted/emulated device — solo en release: el modo desarrollador
  // (developerMode) tiene que estar activado para poder instalar builds de
  // debug via USB/Android Studio, asi que este chequeo bloquearia CUALQUIER
  // prueba en desarrollo si tambien corriera en debug.
  if (kReleaseMode) {
    final bool jailbroken = await SafeDevice.isJailBroken;
    final bool developerMode = await SafeDevice.isDevelopmentModeEnable;
    if (jailbroken || developerMode) {
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
      title: 'OCA Credit',
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
