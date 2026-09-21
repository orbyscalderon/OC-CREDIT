import 'dart:async';
import 'dart:io';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme.dart';
import '../../../data/remote/api_client.dart';
import '../../../l10n/app_localizations.dart';
import '../../../providers/auth_provider.dart';

// GET /reportes/* devuelve columnas agregadas de Postgres (SUM/COUNT) que
// llegan como String, no num -- mismo parser que dashboard_screen.dart.
num _n(dynamic v) => v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);

const List<String> _agingCodigos = [
  'Al_Dia',
  '1_a_30_dias',
  '31_a_60_dias',
  '61_a_90_dias',
  'Mas_de_90_dias',
];

const List<Color> _agingColores = [
  Color(0xFF10B981),
  Color(0xFF3B82F6),
  Color(0xFFF59E0B),
  Color(0xFFF97316),
  Color(0xFFEF4444),
];

const List<String> _mesesCortos = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

class ReportesScreen extends ConsumerStatefulWidget {
  const ReportesScreen({super.key});
  @override
  ConsumerState<ReportesScreen> createState() => _ReportesScreenState();
}

class _ReportesScreenState extends ConsumerState<ReportesScreen> {
  List<Map<String, dynamic>>? _aging;
  String? _agingError;
  bool _agingLoading = true;

  List<Map<String, dynamic>>? _arqueos;
  String? _arqueosError;
  bool _arqueosLoading = true;

  List<Map<String, dynamic>>? _ingresos;
  String? _ingresosError;
  bool _ingresosLoading = true;

  Map<String, dynamic>? _moraResumen;
  String? _moraError;
  bool _moraLoading = true;

  List<Map<String, dynamic>> _alertas = [];
  Timer? _alertasTimer;

  @override
  void initState() {
    super.initState();
    _cargarTodo();
    // Las alertas se re-consultan cada 5 minutos mientras la pantalla está
    // abierta -- son las más sensibles al tiempo (cuotas que vencen hoy/mañana).
    _alertasTimer = Timer.periodic(const Duration(minutes: 5), (_) => _cargarAlertas());
  }

  @override
  void dispose() {
    _alertasTimer?.cancel();
    super.dispose();
  }

  Future<void> _cargarTodo() async {
    await Future.wait([
      _cargarAging(),
      _cargarArqueos(),
      _cargarIngresos(),
      _cargarMora(),
      _cargarAlertas(),
    ]);
  }

  Future<void> _cargarAging() async {
    if (mounted) setState(() { _agingLoading = true; _agingError = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/reportes/aging');
      final data = (resp.data as List).cast<Map<String, dynamic>>();
      if (mounted) setState(() { _aging = data; _agingLoading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _agingError = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          _agingLoading = false;
        });
      }
    }
  }

  Future<void> _cargarArqueos() async {
    if (mounted) setState(() { _arqueosLoading = true; _arqueosError = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/reportes/arqueos');
      final data = (resp.data as List).cast<Map<String, dynamic>>();
      if (mounted) setState(() { _arqueos = data; _arqueosLoading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _arqueosError = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          _arqueosLoading = false;
        });
      }
    }
  }

  Future<void> _cargarIngresos() async {
    if (mounted) setState(() { _ingresosLoading = true; _ingresosError = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/reportes/ingresos-mensuales');
      final data = (resp.data as List).cast<Map<String, dynamic>>();
      if (mounted) setState(() { _ingresos = data; _ingresosLoading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _ingresosError = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          _ingresosLoading = false;
        });
      }
    }
  }

  Future<void> _cargarMora() async {
    if (mounted) setState(() { _moraLoading = true; _moraError = null; });
    try {
      final resp = await ApiClient.instance.dio.get('/reportes/mora/resumen');
      final data = resp.data as Map<String, dynamic>;
      if (mounted) setState(() { _moraResumen = data; _moraLoading = false; });
    } catch (_) {
      if (mounted) {
        setState(() {
          _moraError = AppLocalizations.of(context)!.errorNoSePudoCompletarOperacion;
          _moraLoading = false;
        });
      }
    }
  }

  Future<void> _cargarAlertas() async {
    try {
      final resp = await ApiClient.instance.dio.get('/reportes/notificaciones');
      final data = resp.data as Map<String, dynamic>;
      final alertas = (data['alertas'] as List? ?? []).cast<Map<String, dynamic>>();
      if (mounted) setState(() => _alertas = alertas);
    } catch (_) {
      // Silencioso: las alertas son informativas, no bloquean el resto de
      // la pantalla si falla este refresco puntual.
    }
  }

  Future<void> _exportarAging() async {
    final l10n = AppLocalizations.of(context)!;
    final aging = _aging;
    if (aging == null || aging.isEmpty) return;

    final porCodigo = {for (final f in aging) f['rango'] as String: f};
    final totalPrestamos = aging.fold<num>(0, (s, f) => s + _n(f['prestamos']));

    final encabezados = [l10n.csvBanda, l10n.csvCantidadPrestamos, l10n.csvCapital, l10n.csvPorcentaje];
    final filas = <List<String>>[encabezados];
    for (var i = 0; i < _agingCodigos.length; i++) {
      final f = porCodigo[_agingCodigos[i]];
      final prestamos = _n(f?['prestamos']);
      final saldo = _n(f?['saldo_pendiente']);
      final pct = totalPrestamos > 0 ? (prestamos / totalPrestamos * 100) : 0;
      filas.add([
        _agingLabel(l10n, _agingCodigos[i]),
        prestamos.toStringAsFixed(0),
        saldo.toStringAsFixed(2),
        '${pct.toStringAsFixed(1)}%',
      ]);
    }

    String escapar(String s) {
      return s.contains(',') || s.contains('"') || s.contains('\n')
          ? '"${s.replaceAll('"', '""')}"'
          : s;
    }

    final csv = filas.map((fila) => fila.map(escapar).join(',')).join('\r\n');
    const bom = '﻿';

    final dir = await getTemporaryDirectory();
    final hoy = DateTime.now();
    String dos(int n) => n.toString().padLeft(2, '0');
    final nombreArchivo = 'aging-cartera-${hoy.year}-${dos(hoy.month)}-${dos(hoy.day)}.csv';
    final file = File('${dir.path}/$nombreArchivo');
    await file.writeAsString('$bom$csv');

    if (!mounted) return;
    await Share.shareXFiles([XFile(file.path)], text: l10n.csvGenerado);
  }

  String _agingLabel(AppLocalizations l10n, String codigo) {
    switch (codigo) {
      case 'Al_Dia':
        return l10n.agingAlDia;
      case '1_a_30_dias':
        return l10n.aging1a30;
      case '31_a_60_dias':
        return l10n.aging31a60;
      case '61_a_90_dias':
        return l10n.aging61a90;
      default:
        return l10n.agingMas90;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final simbolo = ref.watch(authStateProvider).tenantConfig.simboloMoneda;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.reportesTitulo)),
      body: RefreshIndicator(
        onRefresh: _cargarTodo,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildAging(l10n),
            const SizedBox(height: 16),
            _buildArqueos(l10n, simbolo),
            const SizedBox(height: 16),
            _buildIngresos(l10n, simbolo),
            const SizedBox(height: 16),
            _buildMora(l10n, simbolo),
            if (_alertas.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildAlertas(l10n),
            ],
          ],
        ),
      ),
    );
  }

  // ─── A) Aging de cartera ────────────────────────────────────────────────

  Widget _buildAging(AppLocalizations l10n) {
    return _SectionCard(
      titulo: l10n.agingCarteraTitulo,
      accion: (_aging != null && _aging!.isNotEmpty)
          ? IconButton(
              icon: const Icon(Icons.download_outlined),
              tooltip: l10n.exportar,
              onPressed: _exportarAging,
            )
          : null,
      child: _agingLoading
          ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          : _agingError != null
              ? _MiniError(mensaje: _agingError!, onRetry: _cargarAging, reintentarLabel: l10n.reintentar)
              : (_aging == null || _aging!.isEmpty)
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(l10n.sinDatosDisponibles, style: TextStyle(color: Colors.grey.shade600)),
                    )
                  : _buildAgingContenido(l10n),
    );
  }

  Widget _buildAgingContenido(AppLocalizations l10n) {
    final porCodigo = {for (final f in _aging!) f['rango'] as String: f};
    final prestamos = _agingCodigos.map((c) => _n(porCodigo[c]?['prestamos']).toDouble()).toList();
    final saldos = _agingCodigos.map((c) => _n(porCodigo[c]?['saldo_pendiente']).toDouble()).toList();
    final totalPrestamos = prestamos.fold<double>(0, (s, v) => s + v);
    final maxSaldo = saldos.fold<double>(0, (m, v) => v > m ? v : m);

    return Column(
      children: [
        SizedBox(
          height: 180,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: maxSaldo <= 0 ? 1 : maxSaldo * 1.2,
              barTouchData: BarTouchData(enabled: false),
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 28,
                    getTitlesWidget: (value, meta) {
                      final i = value.toInt();
                      if (i < 0 || i >= _agingCodigos.length) return const SizedBox.shrink();
                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          _agingLabelCorto(i),
                          style: const TextStyle(fontSize: 9),
                        ),
                      );
                    },
                  ),
                ),
              ),
              barGroups: List.generate(_agingCodigos.length, (i) {
                return BarChartGroupData(x: i, barRods: [
                  BarChartRodData(
                    toY: saldos[i],
                    color: _agingColores[i],
                    width: 22,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ]);
              }),
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (totalPrestamos > 0) ...[
          SizedBox(
            height: 160,
            child: PieChart(
              PieChartData(
                sectionsSpace: 2,
                centerSpaceRadius: 30,
                sections: List.generate(_agingCodigos.length, (i) {
                  return PieChartSectionData(
                    value: prestamos[i],
                    color: _agingColores[i],
                    radius: 55,
                    showTitle: false,
                  );
                }),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: List.generate(_agingCodigos.length, (i) {
              final pct = totalPrestamos > 0 ? (prestamos[i] / totalPrestamos * 100) : 0;
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 10, height: 10, decoration: BoxDecoration(color: _agingColores[i], shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text('${_agingLabelCorto(i)} (${pct.toStringAsFixed(1)}%)', style: const TextStyle(fontSize: 11)),
                ],
              );
            }),
          ),
        ],
      ],
    );
  }

  String _agingLabelCorto(int i) {
    final l10n = AppLocalizations.of(context)!;
    return _agingLabel(l10n, _agingCodigos[i]);
  }

  // ─── B) Arqueos del día ─────────────────────────────────────────────────

  Widget _buildArqueos(AppLocalizations l10n, String simbolo) {
    String fmt(dynamic v) => '$simbolo ${_n(v).toStringAsFixed(2)}';

    return _SectionCard(
      titulo: l10n.arqueosDelDiaTitulo,
      child: _arqueosLoading
          ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          : _arqueosError != null
              ? _MiniError(mensaje: _arqueosError!, onRetry: _cargarArqueos, reintentarLabel: l10n.reintentar)
              : (_arqueos == null || _arqueos!.isEmpty)
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(l10n.sinArqueosHoy, style: TextStyle(color: Colors.grey.shade600)),
                    )
                  : Column(
                      children: _arqueos!.map((a) {
                        final diferencia = _n(a['diferencia_cierre']);
                        final estado = a['estado_cuadre'] as String? ?? 'Sin_Cerrar';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (a['cobrador'] as String?) ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    _EstadoCuadreChip(estado: estado, l10n: l10n),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 16,
                                  runSpacing: 4,
                                  children: [
                                    _CampoValor(l10n.aperturaLabel, fmt(a['monto_apertura'])),
                                    _CampoValor(l10n.totalCobros, fmt(a['total_cobros'])),
                                    _CampoValor(l10n.totalGastos, fmt(a['total_gastos'])),
                                    if (a['monto_cierre_declarado'] != null)
                                      _CampoValor(l10n.montoDeclarado, fmt(a['monto_cierre_declarado'])),
                                    if (a['diferencia_cierre'] != null)
                                      _CampoValor(
                                        l10n.diferenciaLabel,
                                        fmt(a['diferencia_cierre']),
                                        color: diferencia < 0
                                            ? AppTheme.danger
                                            : (diferencia > 0 ? AppTheme.success : null),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
    );
  }

  // ─── C) Ingresos mensuales ──────────────────────────────────────────────

  Widget _buildIngresos(AppLocalizations l10n, String simbolo) {
    return _SectionCard(
      titulo: l10n.ingresosMensualesTitulo,
      child: _ingresosLoading
          ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          : _ingresosError != null
              ? _MiniError(mensaje: _ingresosError!, onRetry: _cargarIngresos, reintentarLabel: l10n.reintentar)
              : (_ingresos == null || _ingresos!.isEmpty)
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(l10n.sinDatosDisponibles, style: TextStyle(color: Colors.grey.shade600)),
                    )
                  : _buildIngresosChart(),
    );
  }

  Widget _buildIngresosChart() {
    final datos = _ingresos!;
    final totales = datos.map((m) => _n(m['total']).toDouble()).toList();
    final maxTotal = totales.fold<double>(0, (m, v) => v > m ? v : m);

    String mesLabel(String? mes) {
      if (mes == null || mes.length < 7) return mes ?? '';
      final m = int.tryParse(mes.substring(5, 7));
      if (m == null || m < 1 || m > 12) return mes;
      return _mesesCortos[m - 1];
    }

    return SizedBox(
      height: 200,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxTotal <= 0 ? 1 : maxTotal * 1.2,
          barTouchData: BarTouchData(enabled: false),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 28,
                getTitlesWidget: (value, meta) {
                  final i = value.toInt();
                  if (i < 0 || i >= datos.length) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(mesLabel(datos[i]['mes'] as String?), style: const TextStyle(fontSize: 9)),
                  );
                },
              ),
            ),
          ),
          barGroups: List.generate(datos.length, (i) {
            return BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: totales[i],
                color: const Color(0xFF10B981),
                width: 12,
                borderRadius: BorderRadius.circular(3),
              ),
            ]);
          }),
        ),
      ),
    );
  }

  // ─── D) Mora detallada ──────────────────────────────────────────────────

  Widget _buildMora(AppLocalizations l10n, String simbolo) {
    return _SectionCard(
      titulo: l10n.moraDetalladaTitulo,
      child: _moraLoading
          ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          : _moraError != null
              ? _MiniError(mensaje: _moraError!, onRetry: _cargarMora, reintentarLabel: l10n.reintentar)
              : _buildMoraContenido(l10n, simbolo),
    );
  }

  Widget _buildMoraContenido(AppLocalizations l10n, String simbolo) {
    final resumen = _moraResumen!;
    final detalle = (resumen['detalle'] as List? ?? []).cast<Map<String, dynamic>>();
    String fmt(dynamic v) => '$simbolo ${_n(v).toStringAsFixed(2)}';

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _KpiMini(
                label: l10n.kpiEnMora,
                value: '${_n(resumen['total_prestamos_en_mora']).toInt()}',
                color: AppTheme.danger,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _KpiMini(
                label: l10n.kpiMoraTotal,
                value: fmt(resumen['mora_total_pendiente']),
                color: AppTheme.danger,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _KpiMini(
                label: l10n.kpiDiasMaximoMora,
                value: '${_n(resumen['max_dias_mora']).toInt()}',
                color: AppTheme.warning,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (detalle.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(l10n.sinPrestamosEnMora, style: TextStyle(color: Colors.grey.shade600)),
          )
        else
          ...detalle.map((d) {
            final dias = _n(d['dias_mora']).toInt();
            final colorBadge = dias > 60 ? AppTheme.danger : (dias > 30 ? AppTheme.warning : Colors.yellow.shade700);
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${d['cliente_nombre']} ${d['cliente_apellido']}'),
              subtitle: Text('${l10n.cedulaLabel}: ${d['cedula'] ?? '-'}'),
              trailing: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(color: colorBadge.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
                    child: Text(l10n.badgeDiasMora(dias), style: TextStyle(fontSize: 11, color: colorBadge, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 2),
                  Text(fmt(d['mora_pendiente']), style: const TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w700)),
                ],
              ),
            );
          }),
      ],
    );
  }

  // ─── E) Alertas ─────────────────────────────────────────────────────────

  Widget _buildAlertas(AppLocalizations l10n) {
    return _SectionCard(
      titulo: l10n.alertasTitulo,
      child: Column(
        children: _alertas.map((a) {
          final tipo = a['tipo'] as String? ?? 'info';
          final colores = _colorAlerta(tipo);
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colores.$1,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: colores.$2.withValues(alpha: 0.4)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(_iconoAlerta(a['icono'] as String?, tipo), color: colores.$2, size: 22),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text((a['titulo'] as String?) ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: colores.$2)),
                      const SizedBox(height: 2),
                      Text((a['mensaje'] as String?) ?? '', style: TextStyle(fontSize: 13, color: colores.$2)),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  (Color, Color) _colorAlerta(String tipo) {
    switch (tipo) {
      case 'error':
        return (Colors.red.shade50, AppTheme.danger);
      case 'warning':
        return (Colors.amber.shade50, AppTheme.warning);
      default:
        return (Colors.blue.shade50, AppTheme.primary);
    }
  }

  IconData _iconoAlerta(String? icono, String tipo) {
    switch (icono) {
      case 'AlertTriangle':
        return Icons.warning_amber_rounded;
      case 'Clock':
        return Icons.access_time;
      case 'Calendar':
        return Icons.calendar_today_outlined;
      case 'TrendingDown':
        return Icons.trending_down;
      default:
        return tipo == 'error'
            ? Icons.error_outline
            : (tipo == 'warning' ? Icons.warning_amber_rounded : Icons.info_outline);
    }
  }
}

class _SectionCard extends StatelessWidget {
  final String titulo;
  final Widget child;
  final Widget? accion;
  const _SectionCard({required this.titulo, required this.child, this.accion});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                if (accion != null) accion!,
              ],
            ),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }
}

class _MiniError extends StatelessWidget {
  final String mensaje;
  final VoidCallback onRetry;
  final String reintentarLabel;
  const _MiniError({required this.mensaje, required this.onRetry, required this.reintentarLabel});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        children: [
          Text(mensaje, style: TextStyle(color: Colors.grey.shade600), textAlign: TextAlign.center),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onRetry, child: Text(reintentarLabel)),
        ],
      ),
    );
  }
}

class _CampoValor extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const _CampoValor(this.label, this.value, {this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
      ],
    );
  }
}

class _KpiMini extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _KpiMini({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: Colors.grey.shade700)),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: color)),
          ),
        ],
      ),
    );
  }
}

class _EstadoCuadreChip extends StatelessWidget {
  final String estado;
  final AppLocalizations l10n;
  const _EstadoCuadreChip({required this.estado, required this.l10n});

  @override
  Widget build(BuildContext context) {
    late final Color color;
    late final String label;
    switch (estado) {
      case 'Cuadrado':
        color = AppTheme.success;
        label = l10n.estadoCuadrado;
        break;
      case 'Sobrante':
        color = AppTheme.secondary;
        label = l10n.estadoSobrante;
        break;
      case 'Faltante':
        color = AppTheme.danger;
        label = l10n.estadoFaltante;
        break;
      default:
        color = Colors.grey;
        label = l10n.estadoSinCerrar;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
      child: Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700)),
    );
  }
}
