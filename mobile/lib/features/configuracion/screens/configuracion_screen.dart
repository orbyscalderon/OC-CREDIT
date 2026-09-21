import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;

import '../../../core/theme.dart';
import '../../../data/remote/api_client.dart';
import '../../../l10n/app_localizations.dart';
import '../../../providers/auth_provider.dart';

// SVG queda fuera a propósito -- puede llevar <script> embebido y el
// bucket de logos es público. Debe coincidir con tenants.controller.ts.
const _extensionesLogoPermitidas = ['.png', '.jpg', '.jpeg', '.webp'];
const _maxLogoBytes = 2 * 1024 * 1024;

const Map<String, String> _zonasHorarias = {
  'America/Santo_Domingo': 'Santo Domingo (RD)',
  'America/New_York': 'Nueva York (EE. UU.)',
  'America/Mexico_City': 'Ciudad de México',
  'America/Bogota': 'Bogotá',
  'America/Lima': 'Lima',
  'America/Santiago': 'Santiago de Chile',
  'America/Argentina/Buenos_Aires': 'Buenos Aires',
  'Europe/Madrid': 'Madrid',
};

const List<String> _formatosFecha = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

final _hexColorRegExp = RegExp(r'^#[0-9A-Fa-f]{6}$');

String _mensajeError(BuildContext context, Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      final err = data['error'];
      if (err is List && err.isNotEmpty) return err.first.toString();
      if (err is String) return err;
    }
    return AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
  }
  return AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
}

class ConfiguracionScreen extends ConsumerStatefulWidget {
  const ConfiguracionScreen({super.key});
  @override
  ConsumerState<ConfiguracionScreen> createState() => _ConfiguracionScreenState();
}

class _ConfiguracionScreenState extends ConsumerState<ConfiguracionScreen> {
  final _formKey = GlobalKey<FormState>();

  bool _loading = true;
  String? _errorCarga;
  bool _guardando = false;
  bool _subiendoLogo = false;

  String? _urlLogo;
  final _nombreComercialCtrl = TextEditingController();
  final _colorPrimarioCtrl = TextEditingController();
  final _colorSecundarioCtrl = TextEditingController();
  final _monedaCtrl = TextEditingController();
  final _simboloMonedaCtrl = TextEditingController();
  final _textoPieReciboCtrl = TextEditingController();
  final _diasMoraGraciaCtrl = TextEditingController();
  final _tasaMoraDiariaCtrl = TextEditingController();
  final _radioGeocercaCtrl = TextEditingController();
  final _diasMoraReporteAutoCtrl = TextEditingController();

  String _zonaHoraria = 'America/Santo_Domingo';
  String _formatoFecha = 'DD/MM/YYYY';
  bool _permiteCobroDomingo = false;
  bool _whatsappActivo = false;
  bool _reporteAutoActivo = false;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  @override
  void dispose() {
    _nombreComercialCtrl.dispose();
    _colorPrimarioCtrl.dispose();
    _colorSecundarioCtrl.dispose();
    _monedaCtrl.dispose();
    _simboloMonedaCtrl.dispose();
    _textoPieReciboCtrl.dispose();
    _diasMoraGraciaCtrl.dispose();
    _tasaMoraDiariaCtrl.dispose();
    _radioGeocercaCtrl.dispose();
    _diasMoraReporteAutoCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() { _loading = true; _errorCarga = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/tenants/settings');
      final data = resp.data as Map<String, dynamic>;
      _aplicarSettings(data);
      setState(() => _loading = false);
    } catch (_) {
      if (mounted) {
        setState(() {
          _errorCarga = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          _loading = false;
        });
      }
    }
  }

  void _aplicarSettings(Map<String, dynamic> data) {
    _urlLogo = data['url_logo'] as String?;
    _nombreComercialCtrl.text = (data['nombre_comercial'] as String?) ?? '';
    _colorPrimarioCtrl.text = (data['color_primario'] as String?) ?? '#2563EB';
    _colorSecundarioCtrl.text = (data['color_secundario'] as String?) ?? '#1D4ED8';
    _monedaCtrl.text = (data['moneda'] as String?) ?? 'DOP';
    _simboloMonedaCtrl.text = (data['simbolo_moneda'] as String?) ?? 'RD\$';
    _textoPieReciboCtrl.text = (data['texto_pie_recibo'] as String?) ?? '';
    final diasGracia = data['dias_mora_gracia'];
    _diasMoraGraciaCtrl.text = diasGracia == null ? '0' : '${(diasGracia as num).toInt()}';
    final tasaFraccion = (data['tasa_mora_diaria'] as num?)?.toDouble() ?? 0;
    _tasaMoraDiariaCtrl.text = _formatearNumero(tasaFraccion * 100);
    final radio = data['radio_geocerca_metros'];
    _radioGeocercaCtrl.text = radio == null ? '50' : '${(radio as num).toInt()}';
    _permiteCobroDomingo = data['permite_cobro_domingo'] == true;
    _whatsappActivo = data['whatsapp_activo'] == true;
    _zonaHoraria = (data['zona_horaria'] as String?) ?? _zonaHoraria;
    if (!_zonasHorarias.containsKey(_zonaHoraria)) _zonaHoraria = 'America/Santo_Domingo';
    _formatoFecha = (data['formato_fecha'] as String?) ?? _formatoFecha;
    if (!_formatosFecha.contains(_formatoFecha)) _formatoFecha = 'DD/MM/YYYY';
    final diasReporteAuto = data['dias_mora_reporte_auto'] as num?;
    _reporteAutoActivo = diasReporteAuto != null;
    _diasMoraReporteAutoCtrl.text = diasReporteAuto == null ? '' : diasReporteAuto.toInt().toString();
  }

  String _formatearNumero(double v) {
    // Evita mostrar "2.0" cuando el valor es entero, sin depender de intl.
    return v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  }

  Future<void> _elegirLogo() async {
    final l10n = AppLocalizations.of(context)!;
    try {
      final imagen = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 90);
      if (imagen == null) return;

      final ext = p.extension(imagen.path).toLowerCase();
      if (!_extensionesLogoPermitidas.contains(ext)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorLogoFormato)));
        }
        return;
      }
      final file = File(imagen.path);
      final tamano = await file.length();
      if (tamano > _maxLogoBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorLogoTamano)));
        }
        return;
      }

      setState(() => _subiendoLogo = true);
      final formData = FormData.fromMap({
        'logo': await MultipartFile.fromFile(file.path, filename: p.basename(file.path)),
      });
      final resp = await ApiClient.instance.dio.post('/tenants/logo', data: formData);
      final nuevaUrl = resp.data?['url_logo'] as String?;
      if (mounted) {
        setState(() {
          _urlLogo = nuevaUrl;
          _subiendoLogo = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.logoActualizado), backgroundColor: AppTheme.success));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _subiendoLogo = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorSubirLogo)));
      }
    }
  }

  Future<void> _guardar() async {
    final l10n = AppLocalizations.of(context)!;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _guardando = true);
    try {
      final body = {
        'nombre_comercial': _nombreComercialCtrl.text.trim().isEmpty ? null : _nombreComercialCtrl.text.trim(),
        'color_primario': _colorPrimarioCtrl.text.trim(),
        'color_secundario': _colorSecundarioCtrl.text.trim(),
        'moneda': _monedaCtrl.text.trim(),
        'simbolo_moneda': _simboloMonedaCtrl.text.trim(),
        'texto_pie_recibo': _textoPieReciboCtrl.text.trim().isEmpty ? null : _textoPieReciboCtrl.text.trim(),
        'zona_horaria': _zonaHoraria,
        'formato_fecha': _formatoFecha,
        'dias_mora_gracia': int.parse(_diasMoraGraciaCtrl.text.trim()),
        'tasa_mora_diaria': double.parse(_tasaMoraDiariaCtrl.text.trim()) / 100,
        'radio_geocerca_metros': int.parse(_radioGeocercaCtrl.text.trim()),
        'permite_cobro_domingo': _permiteCobroDomingo,
        'whatsapp_activo': _whatsappActivo,
        'dias_mora_reporte_auto': _reporteAutoActivo ? int.parse(_diasMoraReporteAutoCtrl.text.trim()) : null,
      };
      final resp = await ApiClient.instance.dio.put('/tenants/settings', data: body);
      final data = resp.data as Map<String, dynamic>;
      if (mounted) {
        _aplicarSettings(data);
        setState(() => _guardando = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.configuracionGuardada), backgroundColor: AppTheme.success));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _guardando = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_mensajeError(context, e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final esAdmin = ref.watch(authStateProvider).tienePermiso('tenant_editar_config');

    return Scaffold(
      appBar: AppBar(title: Text(l10n.configuracionTitulo)),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _errorCarga != null
                ? _buildErrorCarga(l10n)
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (!esAdmin)
                        Card(
                          color: Colors.blue.shade50,
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline, color: AppTheme.primary),
                                const SizedBox(width: 10),
                                Expanded(child: Text(l10n.soloAdminPuedeEditar, style: const TextStyle(fontSize: 13))),
                              ],
                            ),
                          ),
                        ),
                      Form(
                        key: _formKey,
                        child: Column(
                          children: [
                            _buildLogoCard(l10n, esAdmin),
                            const SizedBox(height: 12),
                            _buildDatosGeneralesCard(l10n, esAdmin),
                            const SizedBox(height: 12),
                            _buildMoraCobranzaCard(l10n, esAdmin),
                            const SizedBox(height: 12),
                            _buildWhatsappCard(l10n, esAdmin),
                            if (esAdmin) ...[
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: _guardando ? null : _guardar,
                                icon: _guardando
                                    ? const SizedBox(
                                        height: 18, width: 18,
                                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Icon(Icons.save_outlined),
                                label: Text(_guardando ? l10n.enviando : l10n.guardarCambios),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      const _CambiarPasswordCard(),
                      const SizedBox(height: 20),
                      const _EliminarCuentaCard(),
                    ],
                  ),
      ),
    );
  }

  Widget _buildErrorCarga(AppLocalizations l10n) {
    return LayoutBuilder(
      builder: (_, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                const SizedBox(height: 12),
                Text(_errorCarga!, style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: _cargar, child: Text(l10n.reintentar)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoCard(AppLocalizations l10n, bool esAdmin) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.logoTitulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: (_urlLogo != null && _urlLogo!.isNotEmpty)
                      ? CachedNetworkImage(
                          imageUrl: _urlLogo!,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            width: 64, height: 64, color: Colors.grey.shade100,
                            child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                          ),
                          errorWidget: (_, __, ___) => Container(
                            width: 64, height: 64, color: Colors.grey.shade200,
                            child: const Icon(Icons.image_not_supported_outlined, color: Colors.grey),
                          ),
                        )
                      : Container(
                          width: 64, height: 64, color: Colors.grey.shade200,
                          child: const Icon(Icons.business_outlined, color: Colors.grey),
                        ),
                ),
                const SizedBox(width: 14),
                if (esAdmin)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _subiendoLogo ? null : _elegirLogo,
                      icon: _subiendoLogo
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.upload_outlined, size: 18),
                      label: Text(l10n.cambiarLogo),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDatosGeneralesCard(AppLocalizations l10n, bool esAdmin) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: _nombreComercialCtrl,
              enabled: esAdmin,
              decoration: InputDecoration(labelText: l10n.nombreComercialLabel, hintText: l10n.hintNombreComercial),
              validator: (v) => (v != null && v.length > 200) ? l10n.errorMaxCaracteres(200) : null,
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildColorField(l10n, _colorPrimarioCtrl, l10n.colorPrimarioLabel, esAdmin)),
                const SizedBox(width: 12),
                Expanded(child: _buildColorField(l10n, _colorSecundarioCtrl, l10n.colorSecundarioLabel, esAdmin)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _monedaCtrl,
                    enabled: esAdmin,
                    decoration: InputDecoration(labelText: l10n.monedaLabel),
                    validator: (v) => (v == null || v.trim().isEmpty || v.trim().length > 3) ? l10n.errorMonedaLongitud : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _simboloMonedaCtrl,
                    enabled: esAdmin,
                    decoration: InputDecoration(labelText: l10n.simboloMonedaLabel),
                    validator: (v) => (v == null || v.trim().isEmpty || v.trim().length > 5) ? l10n.errorSimboloLongitud : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _zonaHoraria,
              decoration: InputDecoration(labelText: l10n.zonaHorariaLabel),
              items: _zonasHorarias.entries
                  .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                  .toList(),
              onChanged: esAdmin ? (v) => setState(() => _zonaHoraria = v ?? _zonaHoraria) : null,
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              initialValue: _formatoFecha,
              decoration: InputDecoration(labelText: l10n.formatoFechaLabel),
              items: _formatosFecha.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
              onChanged: esAdmin ? (v) => setState(() => _formatoFecha = v ?? _formatoFecha) : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _textoPieReciboCtrl,
              enabled: esAdmin,
              maxLines: 3,
              decoration: InputDecoration(labelText: l10n.pieDeReciboLabel, hintText: l10n.hintPieRecibo),
              validator: (v) => (v != null && v.length > 300) ? l10n.errorMaxCaracteres(300) : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildColorField(AppLocalizations l10n, TextEditingController ctrl, String label, bool esAdmin) {
    return StatefulBuilder(
      builder: (context, setLocal) {
        // Recalculado en cada rebuild del StatefulBuilder (no una sola vez
        // al construir el padre) para que el swatch de preview siga lo que
        // el usuario va tecleando -- ver onChanged más abajo.
        Color? preview;
        if (_hexColorRegExp.hasMatch(ctrl.text)) {
          preview = Color(int.parse(ctrl.text.substring(1), radix: 16) + 0xFF000000);
        }
        return TextFormField(
          controller: ctrl,
          enabled: esAdmin,
          decoration: InputDecoration(
            labelText: label,
            prefixIcon: Padding(
              padding: const EdgeInsets.all(12),
              child: Container(
                width: 20, height: 20,
                decoration: BoxDecoration(
                  color: preview ?? Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.grey.shade400),
                ),
              ),
            ),
          ),
          onChanged: (_) => setLocal(() {}),
          validator: (v) => (v == null || !_hexColorRegExp.hasMatch(v.trim())) ? l10n.errorColorInvalido : null,
        );
      },
    );
  }

  Widget _buildMoraCobranzaCard(AppLocalizations l10n, bool esAdmin) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300, width: 1.2)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.moraYCobranzaTitulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _diasMoraGraciaCtrl,
                    enabled: esAdmin,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l10n.diasDeGraciaLabel),
                    validator: (v) {
                      final n = int.tryParse(v?.trim() ?? '');
                      return (n == null || n < 0 || n > 30) ? l10n.errorDiasGraciaRango : null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _tasaMoraDiariaCtrl,
                    enabled: esAdmin,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l10n.tasaMoraDiariaLabel),
                    validator: (v) {
                      final n = double.tryParse(v?.trim() ?? '');
                      return (n == null || n < 0 || n > 100) ? l10n.errorTasaMoraRango : null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _radioGeocercaCtrl,
              enabled: esAdmin,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l10n.radioGeocercaLabel),
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                return (n == null || n < 10 || n > 5000) ? l10n.errorRadioGeocercaRango : null;
              },
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(l10n.permiteCobroDomingoLabel),
              value: _permiteCobroDomingo,
              onChanged: esAdmin ? (v) => setState(() => _permiteCobroDomingo = v) : null,
            ),
            const Divider(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.reporteAutoBuroTitulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: Text(l10n.reportarBuroAutomaticamenteLabel, style: const TextStyle(fontSize: 13)),
                    value: _reporteAutoActivo,
                    onChanged: esAdmin ? (v) => setState(() => _reporteAutoActivo = v ?? false) : null,
                  ),
                  if (_reporteAutoActivo)
                    TextFormField(
                      controller: _diasMoraReporteAutoCtrl,
                      enabled: esAdmin,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: l10n.diasMoraReporteAutoLabel),
                      validator: (v) {
                        if (!_reporteAutoActivo) return null;
                        final n = int.tryParse(v?.trim() ?? '');
                        return (n == null || n < 1 || n > 365) ? l10n.errorDiasReporteAutoRango : null;
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWhatsappCard(AppLocalizations l10n, bool esAdmin) {
    return Card(
      child: SwitchListTile(
        title: Text(l10n.whatsappActivoLabel),
        value: _whatsappActivo,
        onChanged: esAdmin ? (v) => setState(() => _whatsappActivo = v) : null,
      ),
    );
  }
}

class _CambiarPasswordCard extends ConsumerStatefulWidget {
  const _CambiarPasswordCard();
  @override
  ConsumerState<_CambiarPasswordCard> createState() => _CambiarPasswordCardState();
}

class _CambiarPasswordCardState extends ConsumerState<_CambiarPasswordCard> {
  final _actualCtrl = TextEditingController();
  final _nuevaCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();
  bool _cambiando = false;

  @override
  void dispose() {
    _actualCtrl.dispose();
    _nuevaCtrl.dispose();
    _confirmarCtrl.dispose();
    super.dispose();
  }

  bool get _puedeGuardar =>
      _actualCtrl.text.isNotEmpty &&
      _nuevaCtrl.text.length >= 8 &&
      _nuevaCtrl.text == _confirmarCtrl.text;

  Future<void> _cambiarPassword() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() => _cambiando = true);
    try {
      await ApiClient.instance.dio.put('/auth/cambiar-password', data: {
        'password_actual': _actualCtrl.text,
        'nueva_password': _nuevaCtrl.text,
      });
      if (mounted) {
        _actualCtrl.clear();
        _nuevaCtrl.clear();
        _confirmarCtrl.clear();
        setState(() => _cambiando = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.contrasenaActualizada), backgroundColor: AppTheme.success),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _cambiando = false);
        final mensaje = e is DioException
            ? _mensajeError(context, e)
            : l10n.errorCambiarContrasena;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.cambiarContrasenaTitulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 12),
            TextField(
              controller: _actualCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: l10n.contrasenaActualLabel),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _nuevaCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: l10n.contrasenaNuevaLabel),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _confirmarCtrl,
              obscureText: true,
              decoration: InputDecoration(labelText: l10n.confirmarContrasenaLabel),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: (_puedeGuardar && !_cambiando) ? _cambiarPassword : null,
              child: _cambiando
                  ? const SizedBox(
                      height: 18, width: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(l10n.cambiarContrasenaTitulo),
            ),
          ],
        ),
      ),
    );
  }
}

// Requisito de Google Play: el usuario tiene que poder eliminar su cuenta
// sin depender de soporte. El backend anonimiza (no borra físicamente) para
// preservar préstamos/cobros por obligaciones contables de la empresa, y
// bloquea el borrado si es el único admin_tenant activo del tenant.
class _EliminarCuentaCard extends ConsumerStatefulWidget {
  const _EliminarCuentaCard();
  @override
  ConsumerState<_EliminarCuentaCard> createState() => _EliminarCuentaCardState();
}

class _EliminarCuentaCardState extends ConsumerState<_EliminarCuentaCard> {
  bool _expandido = false;
  final _passwordCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();
  bool _eliminando = false;

  @override
  void dispose() {
    _passwordCtrl.dispose();
    _confirmarCtrl.dispose();
    super.dispose();
  }

  bool get _puedeEliminar => _passwordCtrl.text.isNotEmpty && _confirmarCtrl.text == 'ELIMINAR';

  Future<void> _eliminarCuenta() async {
    setState(() => _eliminando = true);
    try {
      await ApiClient.instance.dio.delete('/auth/mi-cuenta', data: {'password': _passwordCtrl.text});
      if (mounted) await ref.read(authStateProvider.notifier).logout();
    } catch (e) {
      if (mounted) {
        setState(() => _eliminando = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_mensajeError(context, e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppTheme.danger.withValues(alpha: 0.3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(l10n.zonaPeligroTitulo,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: AppTheme.danger)),
                ),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.danger,
                    side: const BorderSide(color: AppTheme.danger),
                  ),
                  onPressed: () => setState(() => _expandido = !_expandido),
                  child: Text(l10n.eliminarMiCuentaTitulo),
                ),
              ],
            ),
            if (_expandido) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(l10n.eliminarCuentaAviso, style: const TextStyle(fontSize: 12)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordCtrl,
                obscureText: true,
                decoration: InputDecoration(labelText: l10n.contrasenaActualLabel),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirmarCtrl,
                decoration: InputDecoration(labelText: l10n.eliminarCuentaConfirmarLabel),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
                onPressed: (_puedeEliminar && !_eliminando) ? _eliminarCuenta : null,
                child: _eliminando
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(l10n.eliminarDefinitivamenteBoton),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
