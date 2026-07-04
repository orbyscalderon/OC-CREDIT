// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  tenantId: string;
  empleadoId: string;
  rol: Rol;
  email: string;
  iat: number;
  exp: number;
}

export enum Rol {
  ADMIN_TENANT = 'admin_tenant',
  SUPERVISOR_TENANT = 'supervisor_tenant',
  COBRADOR_TENANT = 'cobrador_tenant',
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface TenantSettings {
  url_logo: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  moneda: string;
  simbolo_moneda: string;
  texto_pie_recibo: string | null;
  nombre_comercial: string | null;
}

// ─── Cliente ─────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  cedula: string | null;
  nombre: string;
  apellido: string;
  telefono: string | null;
  direccion_casa: string | null;
  latitud_casa: number | null;
  longitud_casa: number | null;
  activo: boolean;
  ruta_id: string | null;
  foto_cedula_frontal_url: string | null;
  foto_cedula_trasera_url: string | null;
  created_at: string;
}

// ─── Préstamo ─────────────────────────────────────────────────────────────────

export type EstadoPrestamo =
  | 'Pendiente' | 'Activo' | 'Pagado' | 'Vencido'
  | 'Rechazado' | 'PagadoPorRenovacion';

export type ModalidadPrestamo = 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual';

export interface Prestamo {
  id: string;
  cliente_id: string;
  cliente?: Pick<Cliente, 'nombre' | 'apellido' | 'cedula'>;
  cobrador_id: string | null;
  ruta_id: string | null;
  capital_aprobado: number;
  tasa_interes: number;
  num_cuotas: number;
  modalidad: ModalidadPrestamo;
  estado: EstadoPrestamo;
  fecha_aprobacion: string | null;
  fecha_primer_vencimiento: string | null;
  cuotas?: CuotaAmortizacion[];
  created_at: string;
}

export interface CuotaAmortizacion {
  id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  capital: number;
  interes: number;
  monto_total: number;
  capital_pagado: number;
  interes_pagado: number;
  monto_pagado: number;
  estado: 'Pendiente' | 'Pagado' | 'Abonado' | 'Vencida';
  fecha_pago: string | null;
}

// ─── Cobro ────────────────────────────────────────────────────────────────────

export interface RegistrarCobroDto {
  uuid_idempotencia: string;
  prestamo_id: string;
  monto_cobrado: number;
  caja_id: string;
  lat?: number;
  lng?: number;
  metodo_pago?: string;
}

// ─── Caja ─────────────────────────────────────────────────────────────────────

export type EstadoCaja = 'Abierta' | 'Cerrada';

export interface Caja {
  id: string;
  cobrador_id: string;
  cobrador?: Pick<Empleado, 'nombre' | 'apellido'>;
  ruta_id: string | null;
  ruta?: Pick<Ruta, 'nombre'>;
  fecha: string;
  estado: EstadoCaja;
  monto_apertura: number;
  total_cobros: number;
  total_gastos: number;
  monto_cierre_declarado: number | null;
  diferencia_cierre: number | null;
  estado_cuadre: 'Cuadrado' | 'Sobrante' | 'Faltante' | null;
  created_at: string;
}

/** Forma de GET /cajas/:id/arqueo — distinta de Caja: nombres planos, sin relaciones. */
export interface ArqueoCaja {
  caja_id: string;
  cobrador_nombre: string;
  ruta_nombre: string | null;
  fecha: string;
  estado: EstadoCaja;
  monto_apertura: number;
  total_cobros: number;
  total_gastos: number;
  monto_esperado: number;
  monto_cierre_declarado?: number;
  diferencia_cierre?: number;
  estado_cuadre?: 'Cuadrado' | 'Sobrante' | 'Faltante';
}

// ─── Empleado ─────────────────────────────────────────────────────────────────

export interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  telefono: string | null;
  activo: boolean;
  email: string;
  rol: Rol;
  usuario_id: string;
  ultimo_acceso: string | null;
}

// ─── Feriado ──────────────────────────────────────────────────────────────────

export interface Feriado {
  fecha: string;
  descripcion: string | null;
  tenant_id: string | null;
}

// ─── Cobro ────────────────────────────────────────────────────────────────────

export interface CobroResultado {
  transaccion_id: string;
  prestamo_id: string;
  distribucion: {
    mora_absorbida: number;
    interes_absorbido: number;
    capital_absorbido: number;
    excedente: number;
  };
  prestamo_resumen: {
    estado: string;
    cuotas_pendientes: number;
    saldo_total_pendiente: number;
  };
  timestamp_procesado: string;
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export interface Ruta {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  empleado_id: string | null;
  cobrador?: Pick<Empleado, 'nombre' | 'apellido'>;
}

export interface CoordenadasResponse {
  lat: number;
  lng: number;
  tipo: 'cobro' | 'novedad';
  descripcion: string;
  monto?: number;
  created_at: string;
}

export interface ClienteUbicacion {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string | null;
  lat: number;
  lng: number;
  direccion_casa: string | null;
  prestamos_activos: number;
}

export interface CoordenadasRuta {
  eventos: CoordenadasResponse[];
  clientes: ClienteUbicacion[];
}

// ─── Buró de Crédito ──────────────────────────────────────────────────────────

export type NivelRiesgo = 'Bajo' | 'Medio' | 'Alto' | 'CriticoNoPrestable';

export interface HistorialCredito {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  tenant_nombre: string;
  nivel_riesgo: NivelRiesgo;
  motivo: string;
  descripcion_detallada: string | null;
  capital_original: number | null;
  saldo_impagado: number;
  dias_mora_al_reportar: number | null;
  fecha_reporte: string;
  deuda_saldada: boolean;
  activo: boolean;
  created_at: string;
}

export interface PerfilBuro {
  cedula: string;
  nombre: string;
  apellido: string;
  total_reportes: number;
  deuda_pendiente_total: number;
  nivel_riesgo_consolidado: NivelRiesgo | null;
  recomendacion: string | null;
  reportes: HistorialCredito[];
}

// ─── Reportes ─────────────────────────────────────────────────────────────────

export interface DashboardData {
  fecha: string;
  cartera: {
    prestamos_activos: number;
    cartera_total_bruta: number;
    saldo_total_pendiente: number;
    prestamos_vencidos: number;
  };
  recaudo_dia: {
    recaudo_hoy: number;
    cobros_hoy: number;
    cobradores_activos_hoy: number;
  };
  cajas_hoy: {
    cajas_abiertas: number;
    cajas_cerradas: number;
    total_cobrado: number;
    total_gastos: number;
    diferencias_totales: number | null;
  };
  mora: {
    cuotas_en_mora: number;
    mora_total_pendiente: number;
    max_dias_mora: number;
  };
  top_morosos: Array<{
    cliente_id: string;
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string | null;
    prestamo_id: string;
    dias_mora: number;
    mora_pendiente: number;
  }>;
}

export interface AgingBand {
  rango: string;
  prestamos: number;
  saldo_pendiente: number;
}

// ─── Paginado ─────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── API Wrapper ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}
