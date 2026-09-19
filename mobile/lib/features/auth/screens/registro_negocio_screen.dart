import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../core/constants/paises.dart';
import '../../../l10n/app_localizations.dart';

class Plan {
  final String id;
  final String nombre;
  final String descripcion;
  final num precioMensualUsd;

  Plan({required this.id, required this.nombre, required this.descripcion, required this.precioMensualUsd});

  factory Plan.fromJson(Map<String, dynamic> j) => Plan(
        id: j['id'] as String,
        nombre: j['nombre'] as String,
        descripcion: j['descripcion'] as String? ?? '',
        precioMensualUsd: num.tryParse('${j['precio_mensual_usd']}') ?? 0,
      );
}

/// Registro de una empresa nueva (selección de plan incluida) — pensado para
/// que un dueño de negocio pueda arrancar directo desde el teléfono, sin
/// necesitar una laptop a mano. Usa el mismo endpoint público que la Landing
/// page del panel web (POST /planes/registro); no requiere sesión. Después
/// de registrarse, la gestión del negocio (empleados, rutas, clientes) sigue
/// haciéndose desde el panel web — esta app sigue siendo solo para
/// cobradores, así que aquí solo se confirma la cuenta creada.
class RegistroNegocioScreen extends StatefulWidget {
  const RegistroNegocioScreen({super.key});

  @override
  State<RegistroNegocioScreen> createState() => _RegistroNegocioScreenState();
}

class _RegistroNegocioScreenState extends State<RegistroNegocioScreen> {
  final _empresaCtrl = TextEditingController();
  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _telefonoCtrl = TextEditingController();

  String _paisCodigo = 'DO';
  String? _planId;
  List<Plan> _planes = [];
  bool _cargandoPlanes = true;
  bool _enviando = false;
  String? _error;
  bool _exito = false;

  @override
  void initState() {
    super.initState();
    _cargarPlanes();
  }

  @override
  void dispose() {
    _empresaCtrl.dispose();
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _telefonoCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarPlanes() async {
    try {
      final resp = await ApiClient.instance.dio.get('/planes');
      final lista = (resp.data as List).map((e) => Plan.fromJson(e as Map<String, dynamic>)).toList();
      if (mounted) {
        setState(() {
          _planes = lista;
          _planId = lista.isNotEmpty ? lista.first.id : null;
          _cargandoPlanes = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _cargandoPlanes = false);
    }
  }

  Future<void> _registrar() async {
    if (_empresaCtrl.text.trim().length < 3 ||
        _nombreCtrl.text.trim().length < 2 ||
        _apellidoCtrl.text.trim().length < 2 ||
        !_emailCtrl.text.contains('@') ||
        _passCtrl.text.length < 6 ||
        _planId == null) {
      final l10n = AppLocalizations.of(context)!;
      setState(() => _error = l10n.errorCompletaCamposObligatorios);
      return;
    }

    setState(() { _enviando = true; _error = null; });

    try {
      await ApiClient.instance.dio.post('/planes/registro', data: {
        'nombre_empresa': _empresaCtrl.text.trim(),
        'email_admin': _emailCtrl.text.trim(),
        'password': _passCtrl.text,
        'nombre_admin': _nombreCtrl.text.trim(),
        'apellido_admin': _apellidoCtrl.text.trim(),
        if (_telefonoCtrl.text.trim().isNotEmpty) 'telefono': _telefonoCtrl.text.trim(),
        'pais': _paisCodigo,
        'plan_id': _planId,
      });
      if (mounted) setState(() { _enviando = false; _exito = true; });
    } on DioException catch (e) {
      final data = e.response?.data;
      String msg = mounted
          ? AppLocalizations.of(context)!.errorNoSePudoCompletarRegistro
          : 'No se pudo completar el registro. Intenta de nuevo.';
      if (data is Map && data['error'] != null) {
        final err = data['error'];
        msg = err is List ? err.first.toString() : err.toString();
      }
      if (mounted) setState(() { _enviando = false; _error = msg; });
    } catch (_) {
      if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        setState(() {
          _enviando = false;
          _error = l10n.errorNoSePudoConectarServidor;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_exito) return _PantallaExito(nombreEmpresa: _empresaCtrl.text.trim());
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.registrarMiNegocio)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.creaTuCuentaPruebaGratis,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                l10n.despuesDeRegistrarteInfo,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 20),

              Text(l10n.nombreDeLaEmpresa, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(controller: _empresaCtrl, decoration: InputDecoration(hintText: l10n.hintNombreEmpresa)),
              const SizedBox(height: 16),

              Text(l10n.paisLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _paisCodigo,
                items: paises
                    .map((p) => DropdownMenuItem(value: p.codigo, child: Text(p.nombre)))
                    .toList(),
                onChanged: (v) => setState(() => _paisCodigo = v ?? 'DO'),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.nombreLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextField(controller: _nombreCtrl, decoration: InputDecoration(hintText: l10n.hintNombrePila)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.apellidoLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        TextField(controller: _apellidoCtrl, decoration: InputDecoration(hintText: l10n.hintApellido)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              Text(l10n.emailSeraTuUsuario, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(hintText: l10n.hintEmailEjemplo),
              ),
              const SizedBox(height: 16),

              Text(l10n.contrasenaLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(controller: _passCtrl, obscureText: true, decoration: InputDecoration(hintText: l10n.hintMinimoSeisCaracteres)),
              const SizedBox(height: 16),

              Text(l10n.telefonoOpcional, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(controller: _telefonoCtrl, keyboardType: TextInputType.phone, decoration: InputDecoration(hintText: l10n.hintTelefonoEjemplo)),
              const SizedBox(height: 16),

              Text(l10n.planLabel, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              _cargandoPlanes
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 12),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : DropdownButtonFormField<String>(
                      initialValue: _planId,
                      items: _planes
                          .map((p) => DropdownMenuItem(
                                value: p.id,
                                child: Text(l10n.precioPorMes(p.nombre, p.precioMensualUsd.toStringAsFixed(0))),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _planId = v),
                    ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppTheme.danger)),
              ],

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _enviando ? null : _registrar,
                child: _enviando
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l10n.crearCuenta),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PantallaExito extends StatelessWidget {
  final String nombreEmpresa;
  const _PantallaExito({required this.nombreEmpresa});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: AppTheme.success, size: 64),
                const SizedBox(height: 16),
                Text(
                  l10n.empresaRegistradaPruebaGratis(nombreEmpresa),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                Text(
                  l10n.instruccionesPanelWebPostRegistro,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/login'),
                  child: Text(l10n.volverAIniciarSesion),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
