import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';

import '../../../data/remote/api_client.dart';
import '../../../core/theme.dart';
import '../../../l10n/app_localizations.dart';

// IDs de producto configurados en Play Console (Monetizar > Productos >
// Suscripciones) -- deben coincidir exactamente, uno por plan de planes_saas.
const _productIds = <String>{'plan_basico', 'plan_growth', 'plan_pro'};

String _planIdDesdeProductId(String productId) => productId.replaceFirst('plan_', '');

/// Una oferta de un plan (mensual o anual) -- cada plan de suscripción en
/// Play Console tiene un "plan base" por ciclo de facturación, cada uno con
/// su propio precio y offerToken. [GooglePlayProductDetails.subscriptionIndex]
/// distingue cuál ciclo representa esta entrada (ver basePlanId).
class _OfertaPlan {
  _OfertaPlan(this.detalle);
  final GooglePlayProductDetails detalle;

  String get basePlanId {
    final idx = detalle.subscriptionIndex;
    if (idx == null) return '';
    return detalle.productDetails.subscriptionOfferDetails?[idx].basePlanId ?? '';
  }

  bool get esAnual => basePlanId == 'anual';
}

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
  Map<String, List<_OfertaPlan>> _ofertasPorPlan = {};
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
    final ofertas = resp.productDetails.whereType<GooglePlayProductDetails>().map(_OfertaPlan.new).toList();
    final agrupadas = <String, List<_OfertaPlan>>{};
    for (final oferta in ofertas) {
      agrupadas.putIfAbsent(oferta.detalle.id, () => []).add(oferta);
    }
    for (final lista in agrupadas.values) {
      lista.sort((a, b) => a.esAnual ? 1 : -1);
    }
    if (mounted) {
      setState(() {
        _disponible = true;
        _ofertasPorPlan = agrupadas;
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

  void _comprar(_OfertaPlan oferta) {
    setState(() { _error = null; _mensajeExito = null; });
    _iap.buyNonConsumable(
      purchaseParam: GooglePlayPurchaseParam(
        productDetails: oferta.detalle,
        offerToken: oferta.detalle.offerToken,
      ),
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
                      if (_ofertasPorPlan.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(l10n.sinPlanesDisponibles, textAlign: TextAlign.center),
                        ),
                      ..._ofertasPorPlan.entries.map((entry) {
                        final productId = entry.key;
                        final ofertas = entry.value;
                        final primera = ofertas.first.detalle;
                        final procesando = _procesandoProductId == productId;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  primera.title,
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  primera.description,
                                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                ),
                                const SizedBox(height: 12),
                                if (procesando)
                                  const Center(
                                    child: SizedBox(
                                      height: 24, width: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  )
                                else
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: ofertas.map((oferta) {
                                      return ElevatedButton(
                                        onPressed: () => _comprar(oferta),
                                        child: Text(
                                          '${oferta.esAnual ? l10n.anual : l10n.mensual}: ${oferta.detalle.price}',
                                        ),
                                      );
                                    }).toList(),
                                  ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
      ),
    );
  }
}
