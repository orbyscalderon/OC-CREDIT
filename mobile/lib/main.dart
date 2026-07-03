import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'data/local/database_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Abort on rooted/emulated device
  final bool jailbroken = await FlutterJailbreakDetection.jailbroken;
  final bool developerMode = await FlutterJailbreakDetection.developerMode;
  if (jailbroken || developerMode) {
    runApp(const _BlockedApp());
    return;
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
      title: 'OC Credit',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
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
