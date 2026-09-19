// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get misCobrosDelDia => 'Mis cobros del día';

  @override
  String get sincronizarPendientes => 'Sincronizar pendientes';

  @override
  String get miCaja => 'Mi caja';

  @override
  String get buroCredito => 'Buró de crédito';

  @override
  String get registrarNovedad => 'Registrar novedad';

  @override
  String get cerrarSesion => 'Cerrar sesión';

  @override
  String get buscarClienteCedula => 'Buscar cliente o cédula…';

  @override
  String get sinConexionCache => 'Sin conexión — mostrando cache';

  @override
  String get sinResultados => 'Sin resultados';

  @override
  String get appDeCobradores => 'App de Cobradores';

  @override
  String get emailLabel => 'Email';

  @override
  String get contrasenaLabel => 'Contraseña';

  @override
  String get iniciarSesion => 'Iniciar sesión';

  @override
  String get oContinuaCon => 'o continúa con';

  @override
  String get iniciarSesionConGoogle => 'Iniciar sesión con Google';

  @override
  String get negocioNuevoRegistrate => '¿Negocio nuevo? Regístrate aquí';

  @override
  String get copyrightOcaHolding =>
      '© 2026 OCA HOLDING GROUP LLC.\nTodos los derechos reservados.';

  @override
  String get errorSesionGoogleNoObtenida =>
      'No se pudo obtener la sesión de Google. Intenta de nuevo.';

  @override
  String get errorIniciarSesionGoogle =>
      'No se pudo iniciar sesión con Google.';

  @override
  String get registrarMiNegocio => 'Registrar mi negocio';

  @override
  String get creaTuCuentaPruebaGratis =>
      'Crea tu cuenta — 7 días de prueba gratis';

  @override
  String get despuesDeRegistrarteInfo =>
      'Después de registrarte, gestiona empleados, rutas y clientes desde el panel web.';

  @override
  String get nombreDeLaEmpresa => 'Nombre de la empresa';

  @override
  String get hintNombreEmpresa => 'Mi Financiera S.R.L.';

  @override
  String get paisLabel => 'País';

  @override
  String get nombreLabel => 'Nombre';

  @override
  String get hintNombrePila => 'Carlos';

  @override
  String get apellidoLabel => 'Apellido';

  @override
  String get hintApellido => 'López';

  @override
  String get emailSeraTuUsuario => 'Email (será tu usuario)';

  @override
  String get hintEmailEjemplo => 'carlos@empresa.com';

  @override
  String get hintMinimoSeisCaracteres => 'Mínimo 6 caracteres';

  @override
  String get telefonoOpcional => 'Teléfono (opcional)';

  @override
  String get hintTelefonoEjemplo => '809-555-0000';

  @override
  String get planLabel => 'Plan';

  @override
  String precioPorMes(String nombrePlan, String precio) {
    return '$nombrePlan — \$$precio/mes';
  }

  @override
  String get errorCompletaCamposObligatorios =>
      'Completa todos los campos obligatorios.';

  @override
  String get errorNoSePudoCompletarRegistro =>
      'No se pudo completar el registro. Intenta de nuevo.';

  @override
  String get errorNoSePudoConectarServidor =>
      'No se pudo conectar al servidor. Verifica tu conexión.';

  @override
  String get crearCuenta => 'Crear cuenta';

  @override
  String empresaRegistradaPruebaGratis(String nombreEmpresa) {
    return '¡\"$nombreEmpresa\" fue registrada con 7 días de prueba gratis!';
  }

  @override
  String get instruccionesPanelWebPostRegistro =>
      'Ingresa al panel web administrativo con tu email y contraseña para configurar empleados, rutas y clientes. Esta app móvil es solo para cobradores.';

  @override
  String get volverAIniciarSesion => 'Volver a iniciar sesión';

  @override
  String get buroCreditoTitulo => 'Buró de Crédito';

  @override
  String get hintCedulaFormato => '000-0000000-0';

  @override
  String documentoDelCliente(String tipoDocumento) {
    return '$tipoDocumento del cliente';
  }

  @override
  String get consultar => 'Consultar';

  @override
  String get errorNoSePudoConsultarVerificaConexion =>
      'No se pudo consultar. Verifica conexión.';

  @override
  String get historialDeReportes => 'Historial de reportes';

  @override
  String riesgoReportesLinea(String nivel, String total) {
    return 'Riesgo: $nivel  |  Reportes: $total';
  }

  @override
  String get errorNoSePudoCompletarOperacion =>
      'No se pudo completar la operación. Verifica tu conexión.';

  @override
  String get sinCajaAbierta => 'No tienes una caja abierta';

  @override
  String get abreTuCajaParaComenzar =>
      'Abre tu caja para comenzar a registrar cobros.';

  @override
  String get abrirCaja => 'Abrir caja';

  @override
  String get cajaAbierta => 'Caja abierta';

  @override
  String get totalCobros => 'Total cobros';

  @override
  String get totalGastos => 'Total gastos';

  @override
  String get cerrarCaja => 'Cerrar caja';

  @override
  String get ingresaMontoEfectivoFisico =>
      'Ingresa el monto en efectivo que tienes físicamente ahora.';

  @override
  String get montoDeclarado => 'Monto declarado';

  @override
  String get cajaCerradaCorrectamente => 'Caja cerrada correctamente';

  @override
  String get copyrightOcaHoldingCorto =>
      '© 2026 OCA HOLDING GROUP LLC. Todos los derechos reservados.';

  @override
  String get errorNoSePudoAbrirCamara => 'No se pudo abrir la cámara';

  @override
  String get errorIngresaMontoValido => 'Ingresa un monto válido';

  @override
  String get errorDebesAbrirCajaPrimero => 'Debes abrir una caja primero';

  @override
  String get errorGpsObligatorio =>
      'No se pudo obtener el GPS. Actívalo e intenta de nuevo — es obligatorio para registrar el cobro.';

  @override
  String get cobroRegistradoCorrectamente => 'Cobro registrado correctamente';

  @override
  String get sinRedCobroGuardado =>
      'Sin red — cobro guardado y se enviará automáticamente';

  @override
  String get registrarCoboTitulo => 'Registrar cobro';

  @override
  String get modalidadLabel => 'Modalidad';

  @override
  String get cuotasLabel => 'Cuotas';

  @override
  String get cuotaLabel => 'Cuota';

  @override
  String get moraPendienteLabel => 'Mora pendiente';

  @override
  String get montoACobrar => 'Monto a cobrar';

  @override
  String get fotoDeEvidenciaOpcional => 'Foto de evidencia (opcional)';

  @override
  String get repetirFoto => 'Repetir foto';

  @override
  String get quitarFoto => 'Quitar foto';

  @override
  String get tomarFoto => 'Tomar foto';

  @override
  String get confirmarCobro => 'Confirmar cobro';

  @override
  String get notaGpsAuditoriaYSync =>
      'El GPS se captura automáticamente como auditoría.\nSi no hay red, el cobro se sincroniza al recuperar conexión.';

  @override
  String get errorDebesAbrirCajaAntesNovedad =>
      'Debes abrir tu caja antes de registrar una novedad.';

  @override
  String get errorSeleccionaClienteNovedad =>
      'Selecciona el cliente de la novedad.';

  @override
  String get errorGpsObligatorioVisita =>
      'No se pudo obtener el GPS. Actívalo e intenta de nuevo — es obligatorio para registrar la visita.';

  @override
  String get novedadRegistrada => 'Novedad registrada';

  @override
  String get sinConexionNovedadSeEnviara =>
      'Sin conexión — la novedad se enviará al recuperar la señal';

  @override
  String get clienteLabel => 'Cliente';

  @override
  String get sinClientesEnRutaDelDia =>
      'No hay clientes cargados en tu ruta del día.';

  @override
  String get tipoDeNovedad => 'Tipo de novedad';

  @override
  String get descripcionOpcional => 'Descripción (opcional)';

  @override
  String get hintDescribeNovedad => 'Describe la novedad…';

  @override
  String get notaGpsObligatorioVisita =>
      'El GPS se captura automáticamente (obligatorio)';

  @override
  String get enviando => 'Enviando…';

  @override
  String get enviarNovedad => 'Enviar novedad';

  @override
  String get cancelar => 'Cancelar';

  @override
  String get confirmar => 'Confirmar';

  @override
  String get reintentar => 'Reintentar';

  @override
  String get dashboardTitulo => 'Dashboard';

  @override
  String get kpiCarteraTotal => 'Cartera Total';

  @override
  String get kpiRecaudoHoy => 'Recaudo Hoy';

  @override
  String get kpiCajasAbiertas => 'Cajas Abiertas';

  @override
  String get kpiMoraTotal => 'Mora Total';

  @override
  String get topMorosos => 'Top Morosos';

  @override
  String get sinMoraActiva => 'Sin mora activa';

  @override
  String diasDeMora(int dias) {
    return '$dias días de mora';
  }

  @override
  String get solicitudesPendientes => 'Solicitudes pendientes';

  @override
  String get sinSolicitudesPendientes => 'No hay solicitudes pendientes';

  @override
  String get aprobarSolicitud => 'Aprobar solicitud';

  @override
  String get rechazarSolicitud => 'Rechazar solicitud';

  @override
  String get capitalAprobado => 'Capital aprobado';

  @override
  String get tasaDeInteres => 'Tasa de interés (%)';

  @override
  String get fechaPrimerPago => 'Fecha de primer pago';

  @override
  String get cobradorAsignado => 'Cobrador asignado';

  @override
  String get nuevaSolicitud => 'Nueva solicitud de préstamo';

  @override
  String get capitalSolicitado => 'Capital solicitado';

  @override
  String get tasaPropuestaOpcional => 'Tasa propuesta (%, opcional)';

  @override
  String get solicitudCreada =>
      'Solicitud creada — queda pendiente de aprobación';

  @override
  String get enviarSolicitud => 'Enviar solicitud';

  @override
  String get motivoDelRechazo => 'Motivo del rechazo';

  @override
  String get aprobar => 'Aprobar';

  @override
  String get rechazar => 'Rechazar';

  @override
  String get solicitudAprobada => 'Solicitud aprobada';

  @override
  String get solicitudRechazada => 'Solicitud rechazada';

  @override
  String get empleadosTitulo => 'Empleados';

  @override
  String get activarEmpleado => 'Activar empleado';

  @override
  String get desactivarEmpleado => 'Desactivar empleado';

  @override
  String get cajasDelDia => 'Cajas del día';

  @override
  String get sinCajasHoy => 'No hay cajas registradas hoy';

  @override
  String get clienteNuevoTitulo => 'Nuevo cliente';

  @override
  String get direccionLabel => 'Dirección';

  @override
  String get ubicacionCasa => 'Ubicación de la casa';

  @override
  String get usarUbicacionActual => 'Usar ubicación actual';

  @override
  String get actualizarUbicacion => 'Actualizar ubicación';

  @override
  String get ubicacionError => 'No se pudo obtener la ubicación';

  @override
  String get rutaDeCobro => 'Ruta de cobro';

  @override
  String get sinAsignar => 'Sin asignar';

  @override
  String get clienteCreado => 'Cliente creado correctamente';

  @override
  String get crearCliente => 'Crear cliente';

  @override
  String get mapaTitulo => 'Mapa de ruta';

  @override
  String get mapaSinClientes =>
      'Ningún cliente de esta ruta tiene ubicación guardada todavía';

  @override
  String get mapaSeleccionarRuta => 'Selecciona una ruta';

  @override
  String get mapaMiUbicacion => 'Mi ubicación';

  @override
  String get mapaSinPrestamos => 'No hay préstamos activos con ruta asignada';

  @override
  String get mapaPrestamosActivos => 'préstamo(s) activo(s)';

  @override
  String get mapaSinPrestamosActivos => 'Sin préstamos activos';
}
