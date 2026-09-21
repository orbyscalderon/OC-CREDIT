// Smoke test mínimo: la app arranca y muestra la pantalla de login (sin
// sesión guardada) envuelta en el ProviderScope que requiere Riverpod.
//
// Nota: este archivo venía del template por defecto de `flutter create`
// (probaba un contador con una clase `MyApp` que nunca existió en este
// proyecto -- la app real es `OcCreditApp`, ver lib/main.dart). Se corrige
// acá de paso porque bloqueaba `flutter analyze`/`dart analyze` con un error
// de compilación, sin relación con las pantallas de Reportes/Configuración.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:oc_credit_mobile/main.dart';

void main() {
  testWidgets('La app arranca y muestra la pantalla de login', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: OcCreditApp()));
    await tester.pump();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
