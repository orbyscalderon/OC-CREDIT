import { getLang } from '../context/request-context';

type Entrada = { es: string; en: string };

/**
 * Diccionario de mensajes de error/negocio que el backend arma a mano (los
 * de class-validator y los de terceros no pasan por acá). Cada throw new
 * XException(...) en los services usa msg('clave', params?) en vez de un
 * string literal, así responde en el idioma del request (ver
 * common/context/request-context.ts, alimentado por Accept-Language).
 *
 * Convención de nombres: <modulo>_<que_pasa>, snake_case, sin acentos.
 */
export const MESSAGES: Record<string, Entrada> = {
  // ── reportes (backup) ────────────────────────────────────────────────
  reportes_backup_formato_invalido: {
    es: 'El archivo no tiene el formato esperado de un backup',
    en: 'The file does not have the expected backup format',
  },
  reportes_backup_tenant_no_coincide: {
    es: 'Este backup pertenece a otra empresa y no se puede restaurar aquí',
    en: 'This backup belongs to a different company and cannot be restored here',
  },

  // ── auth ──────────────────────────────────────────────────────────────
  auth_token_invalido_expirado: { es: 'Token inválido o expirado', en: 'Invalid or expired token' },
  auth_prueba_vencida: {
    es: 'Tu período de prueba de 7 días terminó. Adquiere un plan para continuar.',
    en: 'Your 7-day trial period has ended. Purchase a plan to continue.',
  },
  auth_acceso_denegado_roles: {
    es: 'Acceso denegado. Se requiere uno de los roles: {{roles}}',
    en: 'Access denied. One of the following roles is required: {{roles}}',
  },
  super_admin_token_requerido: { es: 'Token de super-admin requerido', en: 'Super-admin token required' },
  super_admin_token_invalido_recurso: {
    es: 'Token inválido para este recurso',
    en: 'Invalid token for this resource',
  },
  super_admin_token_invalido_expirado: {
    es: 'Token de super-admin inválido o expirado',
    en: 'Invalid or expired super-admin token',
  },
  auth_credenciales_invalidas: { es: 'Credenciales inválidas', en: 'Invalid credentials' },
  auth_cuenta_bloqueada_hasta: {
    es: 'Cuenta bloqueada hasta {{fecha}}',
    en: 'Account locked until {{fecha}}',
  },
  auth_perfil_empleado_no_encontrado: {
    es: 'Perfil de empleado no encontrado',
    en: 'Employee profile not found',
  },
  auth_empresa_inactiva: { es: 'Empresa inactiva', en: 'Inactive company' },
  auth_google_no_configurado: {
    es: 'Google login no está configurado en este servidor',
    en: 'Google login is not configured on this server',
  },
  auth_google_token_invalido: {
    es: 'Token de Google inválido o expirado',
    en: 'Invalid or expired Google token',
  },
  auth_google_cuenta_no_existe: {
    es: 'No existe una cuenta activa con ese email de Google. Regístrate primero seleccionando un plan.',
    en: 'There is no active account with that Google email. Please register first by selecting a plan.',
  },
  auth_cuenta_inactiva: { es: 'Cuenta inactiva', en: 'Inactive account' },
  auth_sesion_invalida: { es: 'Sesión inválida', en: 'Invalid session' },
  auth_usuario_no_encontrado: { es: 'Usuario no encontrado', en: 'User not found' },
  auth_password_actual_incorrecta: {
    es: 'La contraseña actual es incorrecta',
    en: 'The current password is incorrect',
  },
  auth_password_nueva_muy_corta: {
    es: 'La nueva contraseña debe tener al menos 8 caracteres',
    en: 'The new password must be at least 8 characters long',
  },
  auth_reset_token_invalido: {
    es: 'El enlace no es válido o ya venció. Solicitá uno nuevo.',
    en: 'The link is invalid or has expired. Request a new one.',
  },
  auth_ultimo_admin_no_puede_eliminarse: {
    es: 'Sos el único administrador de esta empresa — no podés eliminar tu cuenta vos mismo. Contactá a soporte para cerrar la cuenta de la empresa completa.',
    en: 'You are the only administrator of this company — you cannot delete your own account. Contact support to close the entire company account.',
  },
  auth_usuario_inactivo_no_encontrado: {
    es: 'Usuario inactivo o no encontrado',
    en: 'Inactive or nonexistent user',
  },
  auth_cuenta_temporalmente_bloqueada: {
    es: 'Cuenta temporalmente bloqueada',
    en: 'Account temporarily locked',
  },

  // ── buró de crédito ───────────────────────────────────────────────────
  buro_reporte_no_encontrado_en_buro: {
    es: 'Reporte no encontrado en el buró',
    en: 'Report not found in the credit bureau',
  },
  buro_solo_tenant_reporto_puede_saldar: {
    es: 'Solo el tenant que reportó puede marcar la deuda como saldada',
    en: 'Only the tenant that filed the report can mark the debt as settled',
  },
  buro_reporte_no_encontrado: { es: 'Reporte no encontrado', en: 'Report not found' },

  // ── cajas ─────────────────────────────────────────────────────────────
  cajas_ya_cerrada_hoy_no_reabrir: {
    es: 'Ya existe una caja cerrada para esta ruta hoy. No se puede reabrir.',
    en: 'A closed cash register already exists for this route today. It cannot be reopened.',
  },
  cajas_activa_no_encontrada: { es: 'Caja activa no encontrada', en: 'Active cash register not found' },
  cajas_sin_activa_para_ruta: {
    es: 'No hay caja activa para esa ruta. Inicie la jornada primero.',
    en: 'There is no active cash register for that route. Start the workday first.',
  },
  cajas_no_encontrada: { es: 'Caja no encontrada', en: 'Cash register not found' },

  // ── clientes ──────────────────────────────────────────────────────────
  clientes_cedula_duplicada: {
    es: 'Ya existe un cliente con esa cédula en esta agencia',
    en: 'A client with that ID number already exists in this agency',
  },
  clientes_registro_duplicado: {
    es: 'Este cliente ya fue registrado',
    en: 'This client was already registered',
  },
  clientes_no_encontrado: { es: 'Cliente no encontrado', en: 'Client not found' },
  clientes_imagen_no_disponible: { es: 'Imagen no disponible', en: 'Image not available' },
  clientes_no_pertenecen_a_ruta: {
    es: 'Uno o más clientes no pertenecen a esta ruta',
    en: 'One or more clients do not belong to this route',
  },

  // ── archivos (compartido entre módulos) ──────────────────────────────
  upload_archivo_no_recibido: { es: 'No se recibió ningún archivo', en: 'No file was received' },

  // ── cobros ────────────────────────────────────────────────────────────
  cobros_sin_foto_evidencia: {
    es: 'Este cobro no tiene foto de evidencia',
    en: 'This payment has no evidence photo',
  },
  cobros_transaccion_duplicada: {
    es: 'Transacción ya procesada. Pago descartado para evitar duplicado.',
    en: 'Transaction already processed. Payment discarded to avoid duplication.',
  },
  cobros_caja_activa_no_encontrada_jornada: {
    es: 'Caja activa no encontrada. Verifique que la jornada esté iniciada.',
    en: 'Active cash register not found. Verify that the workday has been started.',
  },
  cobros_prestamo_no_encontrado_o_inactivo: {
    es: 'Préstamo {{id}} no encontrado o no está activo.',
    en: 'Loan {{id}} not found or not active.',
  },
  cobros_prestamo_no_asignado_a_cobrador_caja: {
    es: 'Este préstamo no está asignado al cobrador dueño de esa caja.',
    en: 'This loan is not assigned to the collector who owns that cash register.',
  },
  cobros_fuera_de_geocerca: {
    es:
      'El cobro se registró a {{distancia}}m de la casa del cliente ' +
      '(máximo permitido: {{radio}}m). Acércate a la ubicación registrada antes de cobrar.',
    en:
      "The payment was recorded {{distancia}}m from the client's home " +
      '(maximum allowed: {{radio}}m). Get closer to the registered location before collecting.',
  },
  cobros_prestamo_sin_cuotas_pendientes: {
    es: 'El préstamo no tiene cuotas pendientes de cobro.',
    en: 'The loan has no pending installments to collect.',
  },
  cobros_monto_mayor_a_saldo: {
    es: 'El monto ({{monto}}) es mayor al saldo pendiente del préstamo ({{saldo}}). Verifica el monto antes de registrar el cobro.',
    en: 'The amount ({{monto}}) exceeds the loan\'s outstanding balance ({{saldo}}). Check the amount before registering the payment.',
  },
  cobros_no_encontrado_para_tenant: {
    es: 'Cobro no encontrado para este tenant',
    en: 'Payment not found for this tenant',
  },
  cobros_no_encontrado: { es: 'Cobro no encontrado', en: 'Payment not found' },

  // ── tenants / planes (compartidos) ───────────────────────────────────
  tenants_no_encontrado: { es: 'Tenant no encontrado', en: 'Tenant not found' },
  cuentas_email_duplicado: {
    es: 'Ya existe una cuenta con ese email',
    en: 'An account with that email already exists',
  },
  planes_no_encontrado: { es: 'Plan no encontrado', en: 'Plan not found' },
  planes_pasarela_no_configurada: {
    es: 'Pasarela de pago no configurada. Contacte al soporte.',
    en: 'Payment gateway not configured. Please contact support.',
  },
  planes_pago_rechazado: { es: 'Pago rechazado: {{status}}', en: 'Payment rejected: {{status}}' },
  planes_error_procesando_pago: {
    es: 'Error procesando pago: {{detalle}}',
    en: 'Error processing payment: {{detalle}}',
  },

  // ── portal cliente / webhooks ────────────────────────────────────────
  portal_cliente_no_encontrado_cedula: {
    es: 'No se encontró cliente con esa cédula',
    en: 'No client found with that ID number',
  },
  portal_webhook_gateway_no_configurado: {
    es: 'Pasarela de webhooks no configurada',
    en: 'Webhook gateway not configured',
  },
  portal_webhook_firma_faltante: { es: 'Falta la firma del webhook', en: 'Missing webhook signature' },
  portal_webhook_firma_invalida: { es: 'Firma de webhook inválida', en: 'Invalid webhook signature' },

  // ── préstamos ─────────────────────────────────────────────────────────
  prestamos_ruta_no_asignada_cobrador: {
    es: 'Esa ruta no está asignada a este cobrador.',
    en: 'That route is not assigned to this collector.',
  },
  prestamos_cliente_ya_tiene_activo: {
    es: 'El cliente ya tiene un préstamo activo. Use la opción de Renovación para re-enganchar.',
    en: 'The client already has an active loan. Use the Renewal option to re-engage.',
  },
  prestamos_solicitud_no_encontrada_o_procesada: {
    es: 'Solicitud no encontrada o ya procesada',
    en: 'Request not found or already processed',
  },
  prestamos_solicitud_duplicada: {
    es: 'Esta solicitud ya fue registrada',
    en: 'This request was already registered',
  },
  prestamos_no_encontrado_activo_para_renovar: {
    es: 'No se encontró préstamo activo para renovar. Use la opción de nuevo préstamo.',
    en: 'No active loan found to renew. Use the new loan option.',
  },
  prestamos_capital_debe_ser_mayor_saldo: {
    es: 'El capital aprobado ({{capital}}) debe ser mayor al saldo pendiente ({{saldo}}) para poder renovar.',
    en: 'The approved principal ({{capital}}) must be greater than the outstanding balance ({{saldo}}) to renew.',
  },
  prestamos_activo_no_encontrado: { es: 'Préstamo activo no encontrado', en: 'Active loan not found' },
  prestamos_no_encontrado: { es: 'Préstamo no encontrado', en: 'Loan not found' },

  // ── rutas ─────────────────────────────────────────────────────────────
  rutas_no_encontrada: { es: 'Ruta no encontrada', en: 'Route not found' },
  rutas_cobrador_no_encontrado: { es: 'Cobrador no encontrado', en: 'Collector not found' },

  // ── super-admin ───────────────────────────────────────────────────────
  super_admin_tenant_no_encontrado: { es: 'Tenant no encontrado', en: 'Tenant not found' },
  super_admin_plan_no_encontrado: { es: 'Plan no encontrado', en: 'Plan not found' },
  super_admin_email_duplicado: {
    es: 'Ya existe una cuenta con ese email',
    en: 'An account with that email already exists',
  },
  super_admin_cuenta_no_encontrada: { es: 'Cuenta no encontrada', en: 'Account not found' },
  super_admin_no_desactivar_propia_cuenta: {
    es: 'No puedes desactivar tu propia cuenta',
    en: 'You cannot deactivate your own account',
  },
  super_admin_no_desactivar_ultima_cuenta: {
    es: 'No puedes desactivar la última cuenta de super-admin activa',
    en: 'You cannot deactivate the last active super-admin account',
  },

  // ── tenants (settings / feriados) ────────────────────────────────────
  tenants_archivo_no_recibido: {
    es: 'No se recibió ningún archivo',
    en: 'No file was received',
  },
  tenants_configuracion_no_encontrada: {
    es: 'Configuración no encontrada',
    en: 'Configuration not found',
  },
  tenants_feriado_no_encontrado_o_global: {
    es: 'Feriado no encontrado o es global (no editable)',
    en: 'Holiday not found or is global (not editable)',
  },

  // ── usuarios / empleados ─────────────────────────────────────────────
  usuarios_email_duplicado: {
    es: 'Ya existe un usuario con ese email',
    en: 'A user with that email already exists',
  },
  usuarios_cedula_duplicada: {
    es: 'Ya existe un empleado con esa cédula',
    en: 'An employee with that ID number already exists',
  },
  usuarios_empleado_no_encontrado: { es: 'Empleado no encontrado', en: 'Employee not found' },
  usuarios_password_muy_corta: {
    es: 'La contraseña debe tener al menos 8 caracteres',
    en: 'The password must be at least 8 characters long',
  },
};

export type MessageKey = keyof typeof MESSAGES;

export function msg(key: MessageKey, params?: Record<string, string | number>): string {
  const entrada = MESSAGES[key];
  let texto = entrada[getLang()];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      texto = texto.split(`{{${k}}}`).join(String(v));
    }
  }
  return texto;
}
