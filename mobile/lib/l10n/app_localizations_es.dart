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
  String get continuarConGoogle => 'Continuar con Google';

  @override
  String get oConEmailYContrasena => 'o con email y contraseña';

  @override
  String get actualizarPlanTitulo => 'Actualizar plan';

  @override
  String get googlePlayNoDisponible =>
      'Google Play Billing no está disponible en este dispositivo.';

  @override
  String get sinPlanesDisponibles =>
      'No hay planes disponibles en este momento.';

  @override
  String get planActualizadoExito =>
      '¡Plan actualizado! Ya puedes seguir usando la cuenta.';

  @override
  String get mensual => 'Mensual';

  @override
  String get anual => 'Anual';

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
  String errorMontoMayorASaldo(String monto, String saldo) {
    return 'El monto ($monto) supera el saldo pendiente del préstamo ($saldo). Verifica antes de continuar.';
  }

  @override
  String get impresoraTermica => 'Impresora térmica';

  @override
  String get impresoraConectada => 'Impresora conectada';

  @override
  String get errorNoSePudoConectarImpresora =>
      'No se pudo conectar con la impresora';

  @override
  String get impresoraGuardadaSubtitulo =>
      'Se usará automáticamente al registrar cobros';

  @override
  String get olvidar => 'Olvidar';

  @override
  String get anchoDePapel => 'Ancho de papel';

  @override
  String get columnas => 'columnas';

  @override
  String get dispositivosEmparejados => 'Impresoras';

  @override
  String get hintEmparejarImpresora =>
      'Empareja la impresora primero desde Bluetooth del sistema, luego selecciónala aquí.';

  @override
  String get buscarImpresoras => 'Buscar impresoras';

  @override
  String get buscando => 'Buscando…';

  @override
  String get sinDispositivosBluetooth =>
      'No se encontraron dispositivos Bluetooth emparejados.';

  @override
  String get cobroRegistradoCorrectamente => 'Cobro registrado correctamente';

  @override
  String get sinRedCobroGuardado =>
      'Sin red — cobro guardado y se enviará automáticamente';

  @override
  String get sinRedClienteSeEnviara =>
      'Sin red — el cliente se guardó y se enviará al recuperar la señal';

  @override
  String get sinRedSolicitudSeEnviara =>
      'Sin red — la solicitud se guardó y se enviará al recuperar la señal';

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

  @override
  String get reportesTitulo => 'Reportes';

  @override
  String get configuracionTitulo => 'Configuración';

  @override
  String get agingCarteraTitulo => 'Aging de cartera';

  @override
  String get arqueosDelDiaTitulo => 'Arqueos del día';

  @override
  String get ingresosMensualesTitulo => 'Ingresos mensuales';

  @override
  String get moraDetalladaTitulo => 'Mora detallada';

  @override
  String get alertasTitulo => 'Alertas';

  @override
  String get agingAlDia => 'Al día';

  @override
  String get aging1a30 => '1-30 días';

  @override
  String get aging31a60 => '31-60 días';

  @override
  String get aging61a90 => '61-90 días';

  @override
  String get agingMas90 => 'Más de 90 días';

  @override
  String get exportar => 'Exportar';

  @override
  String get csvGenerado => 'CSV generado — elige dónde compartirlo';

  @override
  String get sinDatosDisponibles => 'Sin datos disponibles';

  @override
  String get aperturaLabel => 'Apertura';

  @override
  String get diferenciaLabel => 'Diferencia';

  @override
  String get sinArqueosHoy => 'No hay arqueos registrados hoy';

  @override
  String get estadoCuadrado => 'Cuadrado';

  @override
  String get estadoSobrante => 'Sobrante';

  @override
  String get estadoFaltante => 'Faltante';

  @override
  String get estadoSinCerrar => 'Sin cerrar';

  @override
  String get kpiEnMora => 'En mora';

  @override
  String get kpiDiasMaximoMora => 'Días máx. mora';

  @override
  String get sinPrestamosEnMora => 'No hay préstamos en mora';

  @override
  String get cedulaLabel => 'Cédula';

  @override
  String badgeDiasMora(int dias) {
    return '$dias días';
  }

  @override
  String get csvBanda => 'Banda';

  @override
  String get csvCantidadPrestamos => 'Cantidad de préstamos';

  @override
  String get csvCapital => 'Capital';

  @override
  String get csvPorcentaje => 'Porcentaje';

  @override
  String get logoTitulo => 'Logo';

  @override
  String get cambiarLogo => 'Cambiar logo';

  @override
  String get logoActualizado => 'Logo actualizado';

  @override
  String get errorLogoFormato =>
      'Formato no permitido. Usa PNG, JPG, WEBP o SVG';

  @override
  String get errorLogoTamano => 'La imagen no puede superar 2MB';

  @override
  String get errorSubirLogo => 'No se pudo subir el logo';

  @override
  String get nombreComercialLabel => 'Nombre comercial';

  @override
  String get hintNombreComercial => 'Nombre que verán tus clientes';

  @override
  String get colorPrimarioLabel => 'Color primario';

  @override
  String get colorSecundarioLabel => 'Color secundario';

  @override
  String get errorColorInvalido => 'Color hex inválido (ej. #2563EB)';

  @override
  String get monedaLabel => 'Moneda';

  @override
  String get simboloMonedaLabel => 'Símbolo';

  @override
  String get zonaHorariaLabel => 'Zona horaria';

  @override
  String get formatoFechaLabel => 'Formato de fecha';

  @override
  String get pieDeReciboLabel => 'Pie de recibo';

  @override
  String get hintPieRecibo => 'Texto que aparece al final del recibo impreso';

  @override
  String get moraYCobranzaTitulo => 'Mora y cobranza';

  @override
  String get diasDeGraciaLabel => 'Días de gracia';

  @override
  String get tasaMoraDiariaLabel => 'Tasa de mora diaria (%)';

  @override
  String get radioGeocercaLabel => 'Radio de geocerca (metros)';

  @override
  String get permiteCobroDomingoLabel => 'Permite cobro en domingo';

  @override
  String get reporteAutoBuroTitulo => 'Reporte automático a buró';

  @override
  String get reportarBuroAutomaticamenteLabel =>
      'Reportar a buró automáticamente';

  @override
  String get diasMoraReporteAutoLabel => 'Días de mora para reporte automático';

  @override
  String get whatsappActivoLabel => 'WhatsApp activo';

  @override
  String get guardarCambios => 'Guardar cambios';

  @override
  String get configuracionGuardada => 'Configuración guardada correctamente';

  @override
  String get errorGuardarConfiguracion => 'No se pudo guardar la configuración';

  @override
  String get soloAdminPuedeEditar =>
      'Solo el administrador puede editar la configuración';

  @override
  String get errorDiasGraciaRango => 'Debe ser un entero entre 0 y 30';

  @override
  String get errorTasaMoraRango => 'Debe ser un número entre 0 y 100';

  @override
  String get errorRadioGeocercaRango => 'Debe ser un entero entre 10 y 5000';

  @override
  String get errorDiasReporteAutoRango => 'Debe ser un entero entre 1 y 365';

  @override
  String errorMaxCaracteres(int max) {
    return 'Máximo $max caracteres';
  }

  @override
  String get errorMonedaLongitud => 'Entre 1 y 3 caracteres';

  @override
  String get errorSimboloLongitud => 'Entre 1 y 5 caracteres';

  @override
  String get errorCampoRequerido => 'Este campo es obligatorio';

  @override
  String get cambiarContrasenaTitulo => 'Cambiar contraseña';

  @override
  String get contrasenaActualLabel => 'Contraseña actual';

  @override
  String get contrasenaNuevaLabel => 'Contraseña nueva';

  @override
  String get confirmarContrasenaLabel => 'Confirmar contraseña nueva';

  @override
  String get contrasenaActualizada => 'Contraseña actualizada correctamente';

  @override
  String get errorCambiarContrasena =>
      'No se pudo cambiar la contraseña. Verifica tu conexión.';

  @override
  String get zonaPeligroTitulo => 'Zona de peligro';

  @override
  String get eliminarMiCuentaTitulo => 'Eliminar mi cuenta';

  @override
  String get eliminarCuentaAviso =>
      'Se eliminan tu nombre, correo, contraseña y foto de perfil. Los préstamos y cobros que gestionaste quedan en el historial de la empresa (obligación contable), pero ya sin tu cuenta asociada. Esta acción no se puede deshacer.';

  @override
  String get eliminarCuentaConfirmarLabel => 'Escribí ELIMINAR para confirmar';

  @override
  String get eliminarDefinitivamenteBoton => 'Eliminar definitivamente';
}
