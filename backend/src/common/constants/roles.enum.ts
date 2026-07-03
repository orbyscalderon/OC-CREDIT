export enum Rol {
  ADMIN_TENANT      = 'admin_tenant',
  SUPERVISOR_TENANT = 'supervisor_tenant',
  COBRADOR_TENANT   = 'cobrador_tenant',
}

export enum EstadoPrestamo {
  PENDIENTE           = 'Pendiente',
  ACTIVO              = 'Activo',
  PAGADO              = 'Pagado',
  VENCIDO             = 'Vencido',
  PAGADO_RENOVACION   = 'PagadoPorRenovacion',
  RECHAZADO           = 'Rechazado',
  CANCELADO           = 'Cancelado',
}

export enum EstadoCuota {
  PENDIENTE = 'Pendiente',
  ABONADO   = 'Abonado',
  PAGADO    = 'Pagado',
  VENCIDA   = 'Vencida',
}

export enum ModalidadPrestamo {
  DIARIO    = 'Diario',
  SEMANAL   = 'Semanal',
  QUINCENAL = 'Quincenal',
  MENSUAL   = 'Mensual',
}

export enum TipoTransaccion {
  COBRO       = 'Cobro',
  GASTO       = 'Gasto',
  APERTURA    = 'Apertura',
  CIERRE      = 'Cierre',
  PAGO_DIGITAL = 'PagoDigital',
  AJUSTE      = 'Ajuste',
  RETIRO      = 'Retiro',
}

export enum EstadoCaja {
  ABIERTA   = 'Abierta',
  CERRADA   = 'Cerrada',
  CUADRADA  = 'Cuadrada',
}

export enum TipoNovedad {
  CLIENTE_NO_ESTABA = 'Cliente_No_Estaba',
  CLIENTE_SIN_DINERO = 'Cliente_Sin_Dinero',
  OTRO = 'Otro',
}

export enum EstadoCargoMora {
  PENDIENTE  = 'Pendiente',
  PAGADO     = 'Pagado',
  CONDONADO  = 'Condonado',
}
