import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../l10n/app_localizations.dart';

// IDs de producto configurados en Play Console (Monetizar > Productos >
// Suscripciones) -- deben coincidir exactamente, uno por plan de planes_saas.
const _productIds = <String>{'plan_basico', 'plan_growth', 'plan_pro'};

String _planIdDesdeProductId(String productId) => productId.replaceFirst('plan_', '');

/// Compra/actualización de plan hecha DENTRO de la app -- obligatorio por la
/// política de Google Play para apps distribuidas por Play Store que venden
/// suscripciones digitales. El pago inicial/anual sigue disponible también
/// desde el panel web (Stripe); esta pantalla es la vía "Google Play".
class ActualizarPlanScreen extends StatefulWidget {
  const ActualizarPlanScreen({super.key});
  @override
  State<ActualizarPlanScreen> createState() => _ActualizarPlanScreenState();
}

class _ActualizarPlanScreenState extends State<ActualizarPlanScreen> {
  final _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;
  List<ProductDetails> _productos = [];
  bool _disponible = false;
  bool _cargando = true;
  String? _procesandoProductId;
  String? _error;
  String? _mensajeExito;

  @override
  void initState() {
    super.initState();
    _sub = _iap.purchaseStream.listen(_onPurchaseUpdate, onError: (_) {});
    _iniciar();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _iniciar() async {
    final disponible = await _iap.isAvailable();
    if (!disponible) {
      if (mounted) setState(() { _disponible = false; _cargando = false; });
      return;
    }
    final resp = await _iap.queryProductDetails(_productIds);
    if (mounted) {
      setState(() {
        _disponible = true;
        _productos = resp.productDetails;
        _cargando = false;
      });
    }
  }

  Future<void> _onPurchaseUpdate(List<PurchaseDetails> compras) async {
    for (final compra in compras) {
      if (compra.status == PurchaseStatus.pending) {
        if (mounted) setState(() => _procesandoProductId = compra.productID);
        continue;
      }

      if (compra.status == PurchaseStatus.error) {
        if (mounted) {
          setState(() {
            _procesandoProductId = null;
            _error = compra.error?.message ?? AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          });
        }
        continue;
      }

      if (compra.status == PurchaseStatus.purchased || compra.status == PurchaseStatus.restored) {
        await _verificarEnBackend(compra);
      }

      if (compra.pendingCompletePurchase) {
        await _iap.completePurchase(compra);
      }
    }
  }

  Future<void> _verificarEnBackend(PurchaseDetails compra) async {
    try {
      await ApiClient.instance.dio.post('/planes/verificar-compra-google-play', data: {
        'productId': compra.productID,
        'purchaseToken': compra.verificationData.serverVerificationData,
        'planId': _planIdDesdeProductId(compra.productID),
      });
      if (mounted) {
        setState(() {
          _procesandoProductId = null;
          _mensajeExito = AppLocalizations.of(context)!.planActualizadoExito;
          _error = null;
        });
      }
    } on DioException catch (e) {
      if (!mounted) return;
      final data = e.response?.data;
      String msg = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
      if (data is Map && data['error'] != null) {
        final err = data['error'];
        msg = err is List ? err.first.toString() : err.toString();
      }
      setState(() { _procesandoProductId = null; _error = msg; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _procesandoProductId = null;
          _error = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
        });
      }
    }
  }

  void _comprar(ProductDetails producto) {
    setState(() { _error = null; _mensajeExito = null; });
    _iap.buyNonConsumable(
      purchaseParam: PurchaseParam(productDetails: producto),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.actualizarPlanTitulo)),
      body: SafeArea(
        child: _cargando
            ? const Center(child: CircularProgressIndicator())
            : !_disponible
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(l10n.googlePlayNoDisponible, textAlign: TextAlign.center),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_mensajeExito != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(_mensajeExito!, style: const TextStyle(color: AppTheme.success)),
                        ),
                      if (_error != null)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.danger.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(_error!, style: const TextStyle(color: AppTheme.danger)),
                        ),
                      if (_productos.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(l10n.sinPlanesDisponibles, textAlign: TextAlign.center),
                        ),
                      ..._productos.map((p) => Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              title: Text(p.title),
                              subtitle: Text(p.description),
                              trailing: _procesandoProductId == p.id
                                  ? const SizedBox(
                                      height: 20, width: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2))
                                  : ElevatedButton(
                                      onPressed: () => _comprar(p),
                                      child: Text(p.price),
                                    ),
                            ),
                          )),
                    ],
                  ),
      ),
    );
  }
}
