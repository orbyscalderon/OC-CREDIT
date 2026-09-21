import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('es')];

  /// Título de la pantalla principal del cobrador
  ///
  /// In es, this message translates to:
  /// **'Mis cobros del día'**
  String get misCobrosDelDia;

  /// Tooltip del botón de sincronización manual
  ///
  /// In es, this message translates to:
  /// **'Sincronizar pendientes'**
  String get sincronizarPendientes;

  /// No description provided for @miCaja.
  ///
  /// In es, this message translates to:
  /// **'Mi caja'**
  String get miCaja;

  /// No description provided for @buroCredito.
  ///
  /// In es, this message translates to:
  /// **'Buró de crédito'**
  String get buroCredito;

  /// No description provided for @registrarNovedad.
  ///
  /// In es, this message translates to:
  /// **'Registrar novedad'**
  String get registrarNovedad;

  /// No description provided for @cerrarSesion.
  ///
  /// In es, this message translates to:
  /// **'Cerrar sesión'**
  String get cerrarSesion;

  /// No description provided for @buscarClienteCedula.
  ///
  /// In es, this message translates to:
  /// **'Buscar cliente o cédula…'**
  String get buscarClienteCedula;

  /// No description provided for @sinConexionCache.
  ///
  /// In es, this message translates to:
  /// **'Sin conexión — mostrando cache'**
  String get sinConexionCache;

  /// No description provided for @sinResultados.
  ///
  /// In es, this message translates to:
  /// **'Sin resultados'**
  String get sinResultados;

  /// No description provided for @appDeCobradores.
  ///
  /// In es, this message translates to:
  /// **'App de Cobradores'**
  String get appDeCobradores;

  /// No description provided for @emailLabel.
  ///
  /// In es, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @contrasenaLabel.
  ///
  /// In es, this message translates to:
  /// **'Contraseña'**
  String get contrasenaLabel;

  /// No description provided for @iniciarSesion.
  ///
  /// In es, this message translates to:
  /// **'Iniciar sesión'**
  String get iniciarSesion;

  /// No description provided for @oContinuaCon.
  ///
  /// In es, this message translates to:
  /// **'o continúa con'**
  String get oContinuaCon;

  /// No description provided for @iniciarSesionConGoogle.
  ///
  /// In es, this message translates to:
  /// **'Iniciar sesión con Google'**
  String get iniciarSesionConGoogle;

  /// No description provided for @negocioNuevoRegistrate.
  ///
  /// In es, this message translates to:
  /// **'¿Negocio nuevo? Regístrate aquí'**
  String get negocioNuevoRegistrate;

  /// No description provided for @copyrightOcaHolding.
  ///
  /// In es, this message translates to:
  /// **'© 2026 OCA HOLDING GROUP LLC.\nTodos los derechos reservados.'**
  String get copyrightOcaHolding;

  /// No description provided for @errorSesionGoogleNoObtenida.
  ///
  /// In es, this message translates to:
  /// **'No se pudo obtener la sesión de Google. Intenta de nuevo.'**
  String get errorSesionGoogleNoObtenida;

  /// No description provided for @errorIniciarSesionGoogle.
  ///
  /// In es, this message translates to:
  /// **'No se pudo iniciar sesión con Google.'**
  String get errorIniciarSesionGoogle;

  /// No description provided for @registrarMiNegocio.
  ///
  /// In es, this message translates to:
  /// **'Registrar mi negocio'**
  String get registrarMiNegocio;

  /// No description provided for @creaTuCuentaPruebaGratis.
  ///
  /// In es, this message translates to:
  /// **'Crea tu cuenta — 7 días de prueba gratis'**
  String get creaTuCuentaPruebaGratis;

  /// No description provided for @despuesDeRegistrarteInfo.
  ///
  /// In es, this message translates to:
  /// **'Después de registrarte, gestiona empleados, rutas y clientes desde el panel web.'**
  String get despuesDeRegistrarteInfo;

  /// No description provided for @nombreDeLaEmpresa.
  ///
  /// In es, this message translates to:
  /// **'Nombre de la empresa'**
  String get nombreDeLaEmpresa;

  /// No description provided for @hintNombreEmpresa.
  ///
  /// In es, this message translates to:
  /// **'Mi Financiera S.R.L.'**
  String get hintNombreEmpresa;

  /// No description provided for @paisLabel.
  ///
  /// In es, this message translates to:
  /// **'País'**
  String get paisLabel;

  /// No description provided for @nombreLabel.
  ///
  /// In es, this message translates to:
  /// **'Nombre'**
  String get nombreLabel;

  /// No description provided for @hintNombrePila.
  ///
  /// In es, this message translates to:
  /// **'Carlos'**
  String get hintNombrePila;

  /// No description provided for @apellidoLabel.
  ///
  /// In es, this message translates to:
  /// **'Apellido'**
  String get apellidoLabel;

  /// No description provided for @hintApellido.
  ///
  /// In es, this message translates to:
  /// **'López'**
  String get hintApellido;

  /// No description provided for @emailSeraTuUsuario.
  ///
  /// In es, this message translates to:
  /// **'Email (será tu usuario)'**
  String get emailSeraTuUsuario;

  /// No description provided for @hintEmailEjemplo.
  ///
  /// In es, this message translates to:
  /// **'carlos@empresa.com'**
  String get hintEmailEjemplo;

  /// No description provided for @hintMinimoSeisCaracteres.
  ///
  /// In es, this message translates to:
  /// **'Mínimo 6 caracteres'**
  String get hintMinimoSeisCaracteres;

  /// No description provided for @telefonoOpcional.
  ///
  /// In es, this message translates to:
  /// **'Teléfono (opcional)'**
  String get telefonoOpcional;

  /// No description provided for @hintTelefonoEjemplo.
  ///
  /// In es, this message translates to:
  /// **'809-555-0000'**
  String get hintTelefonoEjemplo;

  /// No description provided for @planLabel.
  ///
  /// In es, this message translates to:
  /// **'Plan'**
  String get planLabel;

  /// No description provided for @precioPorMes.
  ///
  /// In es, this message translates to:
  /// **'{nombrePlan} — \${precio}/mes'**
  String precioPorMes(String nombrePlan, String precio);

  /// No description provided for @errorCompletaCamposObligatorios.
  ///
  /// In es, this message translates to:
  /// **'Completa todos los campos obligatorios.'**
  String get errorCompletaCamposObligatorios;

  /// No description provided for @errorNoSePudoCompletarRegistro.
  ///
  /// In es, this message translates to:
  /// **'No se pudo completar el registro. Intenta de nuevo.'**
  String get errorNoSePudoCompletarRegistro;

  /// No description provided for @errorNoSePudoConectarServidor.
  ///
  /// In es, this message translates to:
  /// **'No se pudo conectar al servidor. Verifica tu conexión.'**
  String get errorNoSePudoConectarServidor;

  /// No description provided for @crearCuenta.
  ///
  /// In es, this message translates to:
  /// **'Crear cuenta'**
  String get crearCuenta;

  /// No description provided for @empresaRegistradaPruebaGratis.
  ///
  /// In es, this message translates to:
  /// **'¡\"{nombreEmpresa}\" fue registrada con 7 días de prueba gratis!'**
  String empresaRegistradaPruebaGratis(String nombreEmpresa);

  /// No description provided for @instruccionesPanelWebPostRegistro.
  ///
  /// In es, this message translates to:
  /// **'Ingresa al panel web administrativo con tu email y contraseña para configurar empleados, rutas y clientes. Esta app móvil es solo para cobradores.'**
  String get instruccionesPanelWebPostRegistro;

  /// No description provided for @volverAIniciarSesion.
  ///
  /// In es, this message translates to:
  /// **'Volver a iniciar sesión'**
  String get volverAIniciarSesion;

  /// No description provided for @buroCreditoTitulo.
  ///
  /// In es, this message translates to:
  /// **'Buró de Crédito'**
  String get buroCreditoTitulo;

  /// No description provided for @hintCedulaFormato.
  ///
  /// In es, this message translates to:
  /// **'000-0000000-0'**
  String get hintCedulaFormato;

  /// No description provided for @documentoDelCliente.
  ///
  /// In es, this message translates to:
  /// **'{tipoDocumento} del cliente'**
  String documentoDelCliente(String tipoDocumento);

  /// No description provided for @consultar.
  ///
  /// In es, this message translates to:
  /// **'Consultar'**
  String get consultar;

  /// No description provided for @errorNoSePudoConsultarVerificaConexion.
  ///
  /// In es, this message translates to:
  /// **'No se pudo consultar. Verifica conexión.'**
  String get errorNoSePudoConsultarVerificaConexion;

  /// No description provided for @historialDeReportes.
  ///
  /// In es, this message translates to:
  /// **'Historial de reportes'**
  String get historialDeReportes;

  /// No description provided for @riesgoReportesLinea.
  ///
  /// In es, this message translates to:
  /// **'Riesgo: {nivel}  |  Reportes: {total}'**
  String riesgoReportesLinea(String nivel, String total);

  /// No description provided for @errorNoSePudoCompletarOperacion.
  ///
  /// In es, this message translates to:
  /// **'No se pudo completar la operación. Verifica tu conexión.'**
  String get errorNoSePudoCompletarOperacion;

  /// No description provided for @sinCajaAbierta.
  ///
  /// In es, this message translates to:
  /// **'No tienes una caja abierta'**
  String get sinCajaAbierta;

  /// No description provided for @abreTuCajaParaComenzar.
  ///
  /// In es, this message translates to:
  /// **'Abre tu caja para comenzar a registrar cobros.'**
  String get abreTuCajaParaComenzar;

  /// No description provided for @abrirCaja.
  ///
  /// In es, this message translates to:
  /// **'Abrir caja'**
  String get abrirCaja;

  /// No description provided for @cajaAbierta.
  ///
  /// In es, this message translates to:
  /// **'Caja abierta'**
  String get cajaAbierta;

  /// No description provided for @totalCobros.
  ///
  /// In es, this message translates to:
  /// **'Total cobros'**
  String get totalCobros;

  /// No description provided for @totalGastos.
  ///
  /// In es, this message translates to:
  /// **'Total gastos'**
  String get totalGastos;

  /// No description provided for @cerrarCaja.
  ///
  /// In es, this message translates to:
  /// **'Cerrar caja'**
  String get cerrarCaja;

  /// No description provided for @ingresaMontoEfectivoFisico.
  ///
  /// In es, this message translates to:
  /// **'Ingresa el monto en efectivo que tienes físicamente ahora.'**
  String get ingresaMontoEfectivoFisico;

  /// No description provided for @montoDeclarado.
  ///
  /// In es, this message translates to:
  /// **'Monto declarado'**
  String get montoDeclarado;

  /// No description provided for @cajaCerradaCorrectamente.
  ///
  /// In es, this message translates to:
  /// **'Caja cerrada correctamente'**
  String get cajaCerradaCorrectamente;

  /// No description provided for @copyrightOcaHoldingCorto.
  ///
  /// In es, this message translates to:
  /// **'© 2026 OCA HOLDING GROUP LLC. Todos los derechos reservados.'**
  String get copyrightOcaHoldingCorto;

  /// No description provided for @errorNoSePudoAbrirCamara.
  ///
  /// In es, this message translates to:
  /// **'No se pudo abrir la cámara'**
  String get errorNoSePudoAbrirCamara;

  /// No description provided for @errorIngresaMontoValido.
  ///
  /// In es, this message translates to:
  /// **'Ingresa un monto válido'**
  String get errorIngresaMontoValido;

  /// No description provided for @errorDebesAbrirCajaPrimero.
  ///
  /// In es, this message translates to:
  /// **'Debes abrir una caja primero'**
  String get errorDebesAbrirCajaPrimero;

  /// No description provided for @errorGpsObligatorio.
  ///
  /// In es, this message translates to:
  /// **'No se pudo obtener el GPS. Actívalo e intenta de nuevo — es obligatorio para registrar el cobro.'**
  String get errorGpsObligatorio;

  /// No description provided for @cobroRegistradoCorrectamente.
  ///
  /// In es, this message translates to:
  /// **'Cobro registrado correctamente'**
  String get cobroRegistradoCorrectamente;

  /// No description provided for @sinRedCobroGuardado.
  ///
  /// In es, this message translates to:
  /// **'Sin red — cobro guardado y se enviará automáticamente'**
  String get sinRedCobroGuardado;

  /// No description provided for @registrarCoboTitulo.
  ///
  /// In es, this message translates to:
  /// **'Registrar cobro'**
  String get registrarCoboTitulo;

  /// No description provided for @modalidadLabel.
  ///
  /// In es, this message translates to:
  /// **'Modalidad'**
  String get modalidadLabel;

  /// No description provided for @cuotasLabel.
  ///
  /// In es, this message translates to:
  /// **'Cuotas'**
  String get cuotasLabel;

  /// No description provided for @cuotaLabel.
  ///
  /// In es, this message translates to:
  /// **'Cuota'**
  String get cuotaLabel;

  /// No description provided for @moraPendienteLabel.
  ///
  /// In es, this message translates to:
  /// **'Mora pendiente'**
  String get moraPendienteLabel;

  /// No description provided for @montoACobrar.
  ///
  /// In es, this message translates to:
  /// **'Monto a cobrar'**
  String get montoACobrar;

  /// No description provided for @fotoDeEvidenciaOpcional.
  ///
  /// In es, this message translates to:
  /// **'Foto de evidencia (opcional)'**
  String get fotoDeEvidenciaOpcional;

  /// No description provided for @repetirFoto.
  ///
  /// In es, this message translates to:
  /// **'Repetir foto'**
  String get repetirFoto;

  /// No description provided for @quitarFoto.
  ///
  /// In es, this message translates to:
  /// **'Quitar foto'**
  String get quitarFoto;

  /// No description provided for @tomarFoto.
  ///
  /// In es, this message translates to:
  /// **'Tomar foto'**
  String get tomarFoto;

  /// No description provided for @confirmarCobro.
  ///
  /// In es, this message translates to:
  /// **'Confirmar cobro'**
  String get confirmarCobro;

  /// No description provided for @notaGpsAuditoriaYSync.
  ///
  /// In es, this message translates to:
  /// **'El GPS se captura automáticamente como auditoría.\nSi no hay red, el cobro se sincroniza al recuperar conexión.'**
  String get notaGpsAuditoriaYSync;

  /// No description provided for @errorDebesAbrirCajaAntesNovedad.
  ///
  /// In es, this message translates to:
  /// **'Debes abrir tu caja antes de registrar una novedad.'**
  String get errorDebesAbrirCajaAntesNovedad;

  /// No description provided for @errorSeleccionaClienteNovedad.
  ///
  /// In es, this message translates to:
  /// **'Selecciona el cliente de la novedad.'**
  String get errorSeleccionaClienteNovedad;

  /// No description provided for @errorGpsObligatorioVisita.
  ///
  /// In es, this message translates to:
  /// **'No se pudo obtener el GPS. Actívalo e intenta de nuevo — es obligatorio para registrar la visita.'**
  String get errorGpsObligatorioVisita;

  /// No description provided for @novedadRegistrada.
  ///
  /// In es, this message translates to:
  /// **'Novedad registrada'**
  String get novedadRegistrada;

  /// No description provided for @sinConexionNovedadSeEnviara.
  ///
  /// In es, this message translates to:
  /// **'Sin conexión — la novedad se enviará al recuperar la señal'**
  String get sinConexionNovedadSeEnviara;

  /// No description provided for @clienteLabel.
  ///
  /// In es, this message translates to:
  /// **'Cliente'**
  String get clienteLabel;

  /// No description provided for @sinClientesEnRutaDelDia.
  ///
  /// In es, this message translates to:
  /// **'No hay clientes cargados en tu ruta del día.'**
  String get sinClientesEnRutaDelDia;

  /// No description provided for @tipoDeNovedad.
  ///
  /// In es, this message translates to:
  /// **'Tipo de novedad'**
  String get tipoDeNovedad;

  /// No description provided for @descripcionOpcional.
  ///
  /// In es, this message translates to:
  /// **'Descripción (opcional)'**
  String get descripcionOpcional;

  /// No description provided for @hintDescribeNovedad.
  ///
  /// In es, this message translates to:
  /// **'Describe la novedad…'**
  String get hintDescribeNovedad;

  /// No description provided for @notaGpsObligatorioVisita.
  ///
  /// In es, this message translates to:
  /// **'El GPS se captura automáticamente (obligatorio)'**
  String get notaGpsObligatorioVisita;

  /// No description provided for @enviando.
  ///
  /// In es, this message translates to:
  /// **'Enviando…'**
  String get enviando;

  /// No description provided for @enviarNovedad.
  ///
  /// In es, this message translates to:
  /// **'Enviar novedad'**
  String get enviarNovedad;

  /// No description provided for @cancelar.
  ///
  /// In es, this message translates to:
  /// **'Cancelar'**
  String get cancelar;

  /// No description provided for @confirmar.
  ///
  /// In es, this message translates to:
  /// **'Confirmar'**
  String get confirmar;

  /// No description provided for @reintentar.
  ///
  /// In es, this message translates to:
  /// **'Reintentar'**
  String get reintentar;

  /// No description provided for @dashboardTitulo.
  ///
  /// In es, this message translates to:
  /// **'Dashboard'**
  String get dashboardTitulo;

  /// No description provided for @kpiCarteraTotal.
  ///
  /// In es, this message translates to:
  /// **'Cartera Total'**
  String get kpiCarteraTotal;

  /// No description provided for @kpiRecaudoHoy.
  ///
  /// In es, this message translates to:
  /// **'Recaudo Hoy'**
  String get kpiRecaudoHoy;

  /// No description provided for @kpiCajasAbiertas.
  ///
  /// In es, this message translates to:
  /// **'Cajas Abiertas'**
  String get kpiCajasAbiertas;

  /// No description provided for @kpiMoraTotal.
  ///
  /// In es, this message translates to:
  /// **'Mora Total'**
  String get kpiMoraTotal;

  /// No description provided for @topMorosos.
  ///
  /// In es, this message translates to:
  /// **'Top Morosos'**
  String get topMorosos;

  /// No description provided for @sinMoraActiva.
  ///
  /// In es, this message translates to:
  /// **'Sin mora activa'**
  String get sinMoraActiva;

  /// No description provided for @diasDeMora.
  ///
  /// In es, this message translates to:
  /// **'{dias} días de mora'**
  String diasDeMora(int dias);

  /// No description provided for @solicitudesPendientes.
  ///
  /// In es, this message translates to:
  /// **'Solicitudes pendientes'**
  String get solicitudesPendientes;

  /// No description provided for @sinSolicitudesPendientes.
  ///
  /// In es, this message translates to:
  /// **'No hay solicitudes pendientes'**
  String get sinSolicitudesPendientes;

  /// No description provided for @aprobarSolicitud.
  ///
  /// In es, this message translates to:
  /// **'Aprobar solicitud'**
  String get aprobarSolicitud;

  /// No description provided for @rechazarSolicitud.
  ///
  /// In es, this message translates to:
  /// **'Rechazar solicitud'**
  String get rechazarSolicitud;

  /// No description provided for @capitalAprobado.
  ///
  /// In es, this message translates to:
  /// **'Capital aprobado'**
  String get capitalAprobado;

  /// No description provided for @tasaDeInteres.
  ///
  /// In es, this message translates to:
  /// **'Tasa de interés (%)'**
  String get tasaDeInteres;

  /// No description provided for @fechaPrimerPago.
  ///
  /// In es, this message translates to:
  /// **'Fecha de primer pago'**
  String get fechaPrimerPago;

  /// No description provided for @cobradorAsignado.
  ///
  /// In es, this message translates to:
  /// **'Cobrador asignado'**
  String get cobradorAsignado;

  /// No description provided for @nuevaSolicitud.
  ///
  /// In es, this message translates to:
  /// **'Nueva solicitud de préstamo'**
  String get nuevaSolicitud;

  /// No description provided for @capitalSolicitado.
  ///
  /// In es, this message translates to:
  /// **'Capital solicitado'**
  String get capitalSolicitado;

  /// No description provided for @tasaPropuestaOpcional.
  ///
  /// In es, this message translates to:
  /// **'Tasa propuesta (%, opcional)'**
  String get tasaPropuestaOpcional;

  /// No description provided for @solicitudCreada.
  ///
  /// In es, this message translates to:
  /// **'Solicitud creada — queda pendiente de aprobación'**
  String get solicitudCreada;

  /// No description provided for @enviarSolicitud.
  ///
  /// In es, this message translates to:
  /// **'Enviar solicitud'**
  String get enviarSolicitud;

  /// No description provided for @motivoDelRechazo.
  ///
  /// In es, this message translates to:
  /// **'Motivo del rechazo'**
  String get motivoDelRechazo;

  /// No description provided for @aprobar.
  ///
  /// In es, this message translates to:
  /// **'Aprobar'**
  String get aprobar;

  /// No description provided for @rechazar.
  ///
  /// In es, this message translates to:
  /// **'Rechazar'**
  String get rechazar;

  /// No description provided for @solicitudAprobada.
  ///
  /// In es, this message translates to:
  /// **'Solicitud aprobada'**
  String get solicitudAprobada;

  /// No description provided for @solicitudRechazada.
  ///
  /// In es, this message translates to:
  /// **'Solicitud rechazada'**
  String get solicitudRechazada;

  /// No description provided for @empleadosTitulo.
  ///
  /// In es, this message translates to:
  /// **'Empleados'**
  String get empleadosTitulo;

  /// No description provided for @activarEmpleado.
  ///
  /// In es, this message translates to:
  /// **'Activar empleado'**
  String get activarEmpleado;

  /// No description provided for @desactivarEmpleado.
  ///
  /// In es, this message translates to:
  /// **'Desactivar empleado'**
  String get desactivarEmpleado;

  /// No description provided for @cajasDelDia.
  ///
  /// In es, this message translates to:
  /// **'Cajas del día'**
  String get cajasDelDia;

  /// No description provided for @sinCajasHoy.
  ///
  /// In es, this message translates to:
  /// **'No hay cajas registradas hoy'**
  String get sinCajasHoy;

  /// No description provided for @clienteNuevoTitulo.
  ///
  /// In es, this message translates to:
  /// **'Nuevo cliente'**
  String get clienteNuevoTitulo;

  /// No description provided for @direccionLabel.
  ///
  /// In es, this message translates to:
  /// **'Dirección'**
  String get direccionLabel;

  /// No description provided for @ubicacionCasa.
  ///
  /// In es, this message translates to:
  /// **'Ubicación de la casa'**
  String get ubicacionCasa;

  /// No description provided for @usarUbicacionActual.
  ///
  /// In es, this message translates to:
  /// **'Usar ubicación actual'**
  String get usarUbicacionActual;

  /// No description provided for @actualizarUbicacion.
  ///
  /// In es, this message translates to:
  /// **'Actualizar ubicación'**
  String get actualizarUbicacion;

  /// No description provided for @ubicacionError.
  ///
  /// In es, this message translates to:
  /// **'No se pudo obtener la ubicación'**
  String get ubicacionError;

  /// No description provided for @rutaDeCobro.
  ///
  /// In es, this message translates to:
  /// **'Ruta de cobro'**
  String get rutaDeCobro;

  /// No description provided for @sinAsignar.
  ///
  /// In es, this message translates to:
  /// **'Sin asignar'**
  String get sinAsignar;

  /// No description provided for @clienteCreado.
  ///
  /// In es, this message translates to:
  /// **'Cliente creado correctamente'**
  String get clienteCreado;

  /// No description provided for @crearCliente.
  ///
  /// In es, this message translates to:
  /// **'Crear cliente'**
  String get crearCliente;

  /// No description provided for @mapaTitulo.
  ///
  /// In es, this message translates to:
  /// **'Mapa de ruta'**
  String get mapaTitulo;

  /// No description provided for @mapaSinClientes.
  ///
  /// In es, this message translates to:
  /// **'Ningún cliente de esta ruta tiene ubicación guardada todavía'**
  String get mapaSinClientes;

  /// No description provided for @mapaSeleccionarRuta.
  ///
  /// In es, this message translates to:
  /// **'Selecciona una ruta'**
  String get mapaSeleccionarRuta;

  /// No description provided for @mapaMiUbicacion.
  ///
  /// In es, this message translates to:
  /// **'Mi ubicación'**
  String get mapaMiUbicacion;

  /// No description provided for @mapaSinPrestamos.
  ///
  /// In es, this message translates to:
  /// **'No hay préstamos activos con ruta asignada'**
  String get mapaSinPrestamos;

  /// No description provided for @mapaPrestamosActivos.
  ///
  /// In es, this message translates to:
  /// **'préstamo(s) activo(s)'**
  String get mapaPrestamosActivos;

  /// No description provided for @mapaSinPrestamosActivos.
  ///
  /// In es, this message translates to:
  /// **'Sin préstamos activos'**
  String get mapaSinPrestamosActivos;

  /// No description provided for @reportesTitulo.
  ///
  /// In es, this message translates to:
  /// **'Reportes'**
  String get reportesTitulo;

  /// No description provided for @configuracionTitulo.
  ///
  /// In es, this message translates to:
  /// **'Configuración'**
  String get configuracionTitulo;

  /// No description provided for @agingCarteraTitulo.
  ///
  /// In es, this message translates to:
  /// **'Aging de cartera'**
  String get agingCarteraTitulo;

  /// No description provided for @arqueosDelDiaTitulo.
  ///
  /// In es, this message translates to:
  /// **'Arqueos del día'**
  String get arqueosDelDiaTitulo;

  /// No description provided for @ingresosMensualesTitulo.
  ///
  /// In es, this message translates to:
  /// **'Ingresos mensuales'**
  String get ingresosMensualesTitulo;

  /// No description provided for @moraDetalladaTitulo.
  ///
  /// In es, this message translates to:
  /// **'Mora detallada'**
  String get moraDetalladaTitulo;

  /// No description provided for @alertasTitulo.
  ///
  /// In es, this message translates to:
  /// **'Alertas'**
  String get alertasTitulo;

  /// No description provided for @agingAlDia.
  ///
  /// In es, this message translates to:
  /// **'Al día'**
  String get agingAlDia;

  /// No description provided for @aging1a30.
  ///
  /// In es, this message translates to:
  /// **'1-30 días'**
  String get aging1a30;

  /// No description provided for @aging31a60.
  ///
  /// In es, this message translates to:
  /// **'31-60 días'**
  String get aging31a60;

  /// No description provided for @aging61a90.
  ///
  /// In es, this message translates to:
  /// **'61-90 días'**
  String get aging61a90;

  /// No description provided for @agingMas90.
  ///
  /// In es, this message translates to:
  /// **'Más de 90 días'**
  String get agingMas90;

  /// No description provided for @exportar.
  ///
  /// In es, this message translates to:
  /// **'Exportar'**
  String get exportar;

  /// No description provided for @csvGenerado.
  ///
  /// In es, this message translates to:
  /// **'CSV generado — elige dónde compartirlo'**
  String get csvGenerado;

  /// No description provided for @sinDatosDisponibles.
  ///
  /// In es, this message translates to:
  /// **'Sin datos disponibles'**
  String get sinDatosDisponibles;

  /// No description provided for @aperturaLabel.
  ///
  /// In es, this message translates to:
  /// **'Apertura'**
  String get aperturaLabel;

  /// No description provided for @diferenciaLabel.
  ///
  /// In es, this message translates to:
  /// **'Diferencia'**
  String get diferenciaLabel;

  /// No description provided for @sinArqueosHoy.
  ///
  /// In es, this message translates to:
  /// **'No hay arqueos registrados hoy'**
  String get sinArqueosHoy;

  /// No description provided for @estadoCuadrado.
  ///
  /// In es, this message translates to:
  /// **'Cuadrado'**
  String get estadoCuadrado;

  /// No description provided for @estadoSobrante.
  ///
  /// In es, this message translates to:
  /// **'Sobrante'**
  String get estadoSobrante;

  /// No description provided for @estadoFaltante.
  ///
  /// In es, this message translates to:
  /// **'Faltante'**
  String get estadoFaltante;

  /// No description provided for @estadoSinCerrar.
  ///
  /// In es, this message translates to:
  /// **'Sin cerrar'**
  String get estadoSinCerrar;

  /// No description provided for @kpiEnMora.
  ///
  /// In es, this message translates to:
  /// **'En mora'**
  String get kpiEnMora;

  /// No description provided for @kpiDiasMaximoMora.
  ///
  /// In es, this message translates to:
  /// **'Días máx. mora'**
  String get kpiDiasMaximoMora;

  /// No description provided for @sinPrestamosEnMora.
  ///
  /// In es, this message translates to:
  /// **'No hay préstamos en mora'**
  String get sinPrestamosEnMora;

  /// No description provided for @cedulaLabel.
  ///
  /// In es, this message translates to:
  /// **'Cédula'**
  String get cedulaLabel;

  /// No description provided for @badgeDiasMora.
  ///
  /// In es, this message translates to:
  /// **'{dias} días'**
  String badgeDiasMora(int dias);

  /// No description provided for @csvBanda.
  ///
  /// In es, this message translates to:
  /// **'Banda'**
  String get csvBanda;

  /// No description provided for @csvCantidadPrestamos.
  ///
  /// In es, this message translates to:
  /// **'Cantidad de préstamos'**
  String get csvCantidadPrestamos;

  /// No description provided for @csvCapital.
  ///
  /// In es, this message translates to:
  /// **'Capital'**
  String get csvCapital;

  /// No description provided for @csvPorcentaje.
  ///
  /// In es, this message translates to:
  /// **'Porcentaje'**
  String get csvPorcentaje;

  /// No description provided for @logoTitulo.
  ///
  /// In es, this message translates to:
  /// **'Logo'**
  String get logoTitulo;

  /// No description provided for @cambiarLogo.
  ///
  /// In es, this message translates to:
  /// **'Cambiar logo'**
  String get cambiarLogo;

  /// No description provided for @logoActualizado.
  ///
  /// In es, this message translates to:
  /// **'Logo actualizado'**
  String get logoActualizado;

  /// No description provided for @errorLogoFormato.
  ///
  /// In es, this message translates to:
  /// **'Formato no permitido. Usa PNG, JPG, WEBP o SVG'**
  String get errorLogoFormato;

  /// No description provided for @errorLogoTamano.
  ///
  /// In es, this message translates to:
  /// **'La imagen no puede superar 2MB'**
  String get errorLogoTamano;

  /// No description provided for @errorSubirLogo.
  ///
  /// In es, this message translates to:
  /// **'No se pudo subir el logo'**
  String get errorSubirLogo;

  /// No description provided for @nombreComercialLabel.
  ///
  /// In es, this message translates to:
  /// **'Nombre comercial'**
  String get nombreComercialLabel;

  /// No description provided for @hintNombreComercial.
  ///
  /// In es, this message translates to:
  /// **'Nombre que verán tus clientes'**
  String get hintNombreComercial;

  /// No description provided for @colorPrimarioLabel.
  ///
  /// In es, this message translates to:
  /// **'Color primario'**
  String get colorPrimarioLabel;

  /// No description provided for @colorSecundarioLabel.
  ///
  /// In es, this message translates to:
  /// **'Color secundario'**
  String get colorSecundarioLabel;

  /// No description provided for @errorColorInvalido.
  ///
  /// In es, this message translates to:
  /// **'Color hex inválido (ej. #2563EB)'**
  String get errorColorInvalido;

  /// No description provided for @monedaLabel.
  ///
  /// In es, this message translates to:
  /// **'Moneda'**
  String get monedaLabel;

  /// No description provided for @simboloMonedaLabel.
  ///
  /// In es, this message translates to:
  /// **'Símbolo'**
  String get simboloMonedaLabel;

  /// No description provided for @zonaHorariaLabel.
  ///
  /// In es, this message translates to:
  /// **'Zona horaria'**
  String get zonaHorariaLabel;

  /// No description provided for @formatoFechaLabel.
  ///
  /// In es, this message translates to:
  /// **'Formato de fecha'**
  String get formatoFechaLabel;

  /// No description provided for @pieDeReciboLabel.
  ///
  /// In es, this message translates to:
  /// **'Pie de recibo'**
  String get pieDeReciboLabel;

  /// No description provided for @hintPieRecibo.
  ///
  /// In es, this message translates to:
  /// **'Texto que aparece al final del recibo impreso'**
  String get hintPieRecibo;

  /// No description provided for @moraYCobranzaTitulo.
  ///
  /// In es, this message translates to:
  /// **'Mora y cobranza'**
  String get moraYCobranzaTitulo;

  /// No description provided for @diasDeGraciaLabel.
  ///
  /// In es, this message translates to:
  /// **'Días de gracia'**
  String get diasDeGraciaLabel;

  /// No description provided for @tasaMoraDiariaLabel.
  ///
  /// In es, this message translates to:
  /// **'Tasa de mora diaria (%)'**
  String get tasaMoraDiariaLabel;

  /// No description provided for @radioGeocercaLabel.
  ///
  /// In es, this message translates to:
  /// **'Radio de geocerca (metros)'**
  String get radioGeocercaLabel;

  /// No description provided for @permiteCobroDomingoLabel.
  ///
  /// In es, this message translates to:
  /// **'Permite cobro en domingo'**
  String get permiteCobroDomingoLabel;

  /// No description provided for @reporteAutoBuroTitulo.
  ///
  /// In es, this message translates to:
  /// **'Reporte automático a buró'**
  String get reporteAutoBuroTitulo;

  /// No description provided for @reportarBuroAutomaticamenteLabel.
  ///
  /// In es, this message translates to:
  /// **'Reportar a buró automáticamente'**
  String get reportarBuroAutomaticamenteLabel;

  /// No description provided for @diasMoraReporteAutoLabel.
  ///
  /// In es, this message translates to:
  /// **'Días de mora para reporte automático'**
  String get diasMoraReporteAutoLabel;

  /// No description provided for @whatsappActivoLabel.
  ///
  /// In es, this message translates to:
  /// **'WhatsApp activo'**
  String get whatsappActivoLabel;

  /// No description provided for @guardarCambios.
  ///
  /// In es, this message translates to:
  /// **'Guardar cambios'**
  String get guardarCambios;

  /// No description provided for @configuracionGuardada.
  ///
  /// In es, this message translates to:
  /// **'Configuración guardada correctamente'**
  String get configuracionGuardada;

  /// No description provided for @errorGuardarConfiguracion.
  ///
  /// In es, this message translates to:
  /// **'No se pudo guardar la configuración'**
  String get errorGuardarConfiguracion;

  /// No description provided for @soloAdminPuedeEditar.
  ///
  /// In es, this message translates to:
  /// **'Solo el administrador puede editar la configuración'**
  String get soloAdminPuedeEditar;

  /// No description provided for @errorDiasGraciaRango.
  ///
  /// In es, this message translates to:
  /// **'Debe ser un entero entre 0 y 30'**
  String get errorDiasGraciaRango;

  /// No description provided for @errorTasaMoraRango.
  ///
  /// In es, this message translates to:
  /// **'Debe ser un número entre 0 y 100'**
  String get errorTasaMoraRango;

  /// No description provided for @errorRadioGeocercaRango.
  ///
  /// In es, this message translates to:
  /// **'Debe ser un entero entre 10 y 5000'**
  String get errorRadioGeocercaRango;

  /// No description provided for @errorDiasReporteAutoRango.
  ///
  /// In es, this message translates to:
  /// **'Debe ser un entero entre 1 y 365'**
  String get errorDiasReporteAutoRango;

  /// No description provided for @errorMaxCaracteres.
  ///
  /// In es, this message translates to:
  /// **'Máximo {max} caracteres'**
  String errorMaxCaracteres(int max);

  /// No description provided for @errorMonedaLongitud.
  ///
  /// In es, this message translates to:
  /// **'Entre 1 y 3 caracteres'**
  String get errorMonedaLongitud;

  /// No description provided for @errorSimboloLongitud.
  ///
  /// In es, this message translates to:
  /// **'Entre 1 y 5 caracteres'**
  String get errorSimboloLongitud;

  /// No description provided for @errorCampoRequerido.
  ///
  /// In es, this message translates to:
  /// **'Este campo es obligatorio'**
  String get errorCampoRequerido;

  /// No description provided for @cambiarContrasenaTitulo.
  ///
  /// In es, this message translates to:
  /// **'Cambiar contraseña'**
  String get cambiarContrasenaTitulo;

  /// No description provided for @contrasenaActualLabel.
  ///
  /// In es, this message translates to:
  /// **'Contraseña actual'**
  String get contrasenaActualLabel;

  /// No description provided for @contrasenaNuevaLabel.
  ///
  /// In es, this message translates to:
  /// **'Contraseña nueva'**
  String get contrasenaNuevaLabel;

  /// No description provided for @confirmarContrasenaLabel.
  ///
  /// In es, this message translates to:
  /// **'Confirmar contraseña nueva'**
  String get confirmarContrasenaLabel;

  /// No description provided for @contrasenaActualizada.
  ///
  /// In es, this message translates to:
  /// **'Contraseña actualizada correctamente'**
  String get contrasenaActualizada;

  /// No description provided for @errorCambiarContrasena.
  ///
  /// In es, this message translates to:
  /// **'No se pudo cambiar la contraseña. Verifica tu conexión.'**
  String get errorCambiarContrasena;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
