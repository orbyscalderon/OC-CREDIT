import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../providers/auth_provider.dart';
import '../../../core/theme.dart';
import '../../../data/services/sync_service.dart';
import '../../../l10n/app_localizations.dart';

// Mismo Web Client ID que usa el panel web (VITE_GOOGLE_CLIENT_ID /
// backend GOOGLE_CLIENT_ID) — el backend verifica el idToken contra este
// audience sin importar si vino del flujo web o del nativo de Android.
const _googleWebClientId =
    '1085055865063-lnqimhkarihmtc0mh31srfmh9r33brm0.apps.googleusercontent.com';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  final _googleSignIn = GoogleSignIn(
    scopes: ['email'],
    serverClientId: _googleWebClientId,
  );

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });

    final error = await ref.read(authStateProvider.notifier)
        .login(_emailCtrl.text.trim(), _passCtrl.text.trim());

    if (!mounted) return;
    if (error != null) {
      setState(() { _loading = false; _error = error; });
      return;
    }

    // Si el rol no era cobrador, AuthNotifier.login() ya devolvió el
    // mensaje de error arriba sin marcar la sesión como autenticada — así
    // el router (que observa authStateProvider) nunca navega a /home.
    await SyncService.instance.refreshCache();
    SyncService.instance.startListening();
    if (!mounted) return;
    context.go('/home');
  }

  Future<void> _submitGoogle() async {
    setState(() { _loading = true; _error = null; });

    try {
      final account = await _googleSignIn.signIn();
      if (account == null) {
        // El usuario cerró el selector de cuentas — no es un error.
        if (mounted) setState(() => _loading = false);
        return;
      }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) {
        if (mounted) {
          final l10n = AppLocalizations.of(context)!;
          setState(() {
            _loading = false;
            _error = l10n.errorSesionGoogleNoObtenida;
          });
        }
        return;
      }

      final error = await ref.read(authStateProvider.notifier).loginWithGoogle(idToken);
      if (!mounted) return;
      if (error != null) {
        setState(() { _loading = false; _error = error; });
        return;
      }

      await SyncService.instance.refreshCache();
      SyncService.instance.startListening();
      if (!mounted) return;
      context.go('/home');
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        setState(() {
          _loading = false;
          _error = l10n.errorIniciarSesionGoogle;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppTheme.primary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('OCA Credit',
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text(l10n.appDeCobradores,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                    const SizedBox(height: 28),
                    TextField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: l10n.emailLabel,
                        prefixIcon: const Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _passCtrl,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: l10n.contrasenaLabel,
                        prefixIcon: const Icon(Icons.lock_outlined),
                      ),
                      onSubmitted: (_) => _submit(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                    ],
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              height: 20, width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(l10n.iniciarSesion),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Text(l10n.oContinuaCon,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        ),
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _loading ? null : _submitGoogle,
                      icon: const Icon(Icons.g_mobiledata, size: 26),
                      label: Text(l10n.iniciarSesionConGoogle),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () => context.push('/registro'),
                      child: Text(l10n.negocioNuevoRegistrate,
                          style: const TextStyle(fontSize: 13)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.copyrightOcaHolding,
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
