// Espejo del catálogo del backend (backend/src/common/constants/permisos.enum.ts)
// -- valores textuales, no hace falta mantenerlos 100% sincronizados en
// tiempo real (el backend siempre valida), pero deben coincidir para que
// los checkboxes y el menú realmente reflejen lo que el backend exige.
export enum Permiso {
  CLIENTES_VER          = 'clientes_ver',
  CLIENTES_CREAR        = 'clientes_crear',
  CLIENTES_EDITAR       = 'clientes_editar',

  PRESTAMOS_VER         = 'prestamos_ver',
  PRESTAMOS_SOLICITAR   = 'prestamos_solicitar',
  PRESTAMOS_APROBAR     = 'prestamos_aprobar',

  COBROS_REGISTRAR      = 'cobros_registrar',

  CAJAS_OPERAR          = 'cajas_operar',
  CAJAS_SUPERVISAR      = 'cajas_supervisar',

  RUTAS_VER_PROPIA      = 'rutas_ver_propia',
  RUTAS_GESTIONAR       = 'rutas_gestionar',

  NOVEDADES_REGISTRAR   = 'novedades_registrar',
  NOVEDADES_VER         = 'novedades_ver',

  BURO_CONSULTAR        = 'buro_consultar',
  BURO_REPORTAR         = 'buro_reportar',
  BURO_ADMIN            = 'buro_admin',

  REPORTES_VER          = 'reportes_ver',
  REPORTES_AVANZADOS    = 'reportes_avanzados',
  REPORTES_ADMIN        = 'reportes_admin',

  EMPLEADOS_VER         = 'empleados_ver',
  EMPLEADOS_GESTIONAR   = 'empleados_gestionar',

  TENANT_VER_CONFIG     = 'tenant_ver_config',
  TENANT_EDITAR_CONFIG  = 'tenant_editar_config',

  PLANES_ADMIN          = 'planes_admin',
}

export interface GrupoPermisos {
  categoria: string;
  items: { clave: string; etiqueta: string }[];
}

export const GRUPOS_PERMISOS: GrupoPermisos[] = [
  {
    categoria: 'Clientes',
    items: [
      { clave: 'clientes_ver', etiqueta: 'Ver listado de clientes' },
      { clave: 'clientes_crear', etiqueta: 'Crear clientes nuevos' },
      { clave: 'clientes_editar', etiqueta: 'Editar / reasignar clientes' },
    ],
  },
  {
    categoria: 'Préstamos',
    items: [
      { clave: 'prestamos_ver', etiqueta: 'Ver préstamos' },
      { clave: 'prestamos_solicitar', etiqueta: 'Solicitar préstamo nuevo' },
      { clave: 'prestamos_aprobar', etiqueta: 'Aprobar / rechazar / renovar préstamos' },
    ],
  },
  {
    categoria: 'Cobros y cajas',
    items: [
      { clave: 'cobros_registrar', etiqueta: 'Registrar cobros' },
      { clave: 'cajas_operar', etiqueta: 'Abrir / cerrar caja propia, gastos' },
      { clave: 'cajas_supervisar', etiqueta: 'Ver cajas de todos (panel)' },
    ],
  },
  {
    categoria: 'Rutas y novedades',
    items: [
      { clave: 'rutas_ver_propia', etiqueta: 'Ver mi ruta asignada' },
      { clave: 'rutas_gestionar', etiqueta: 'Crear y gestionar rutas' },
      { clave: 'novedades_registrar', etiqueta: 'Registrar novedad' },
      { clave: 'novedades_ver', etiqueta: 'Ver novedades del día (panel)' },
    ],
  },
  {
    categoria: 'Buró de crédito',
    items: [
      { clave: 'buro_consultar', etiqueta: 'Consultar buró' },
      { clave: 'buro_reportar', etiqueta: 'Reportar / saldar deudores' },
      { clave: 'buro_admin', etiqueta: 'Estadísticas y reportes forzados (admin)' },
    ],
  },
  {
    categoria: 'Reportes',
    items: [
      { clave: 'reportes_ver', etiqueta: 'Ver reportes básicos' },
      { clave: 'reportes_avanzados', etiqueta: 'Cuentas por cobrar, uso del plan' },
      { clave: 'reportes_admin', etiqueta: 'Dashboard, aging, backup (admin)' },
    ],
  },
  {
    categoria: 'Empresa',
    items: [
      { clave: 'empleados_ver', etiqueta: 'Ver empleados' },
      { clave: 'empleados_gestionar', etiqueta: 'Crear / gestionar empleados y permisos' },
      { clave: 'tenant_ver_config', etiqueta: 'Ver configuración de la empresa' },
      { clave: 'tenant_editar_config', etiqueta: 'Editar configuración de la empresa' },
      { clave: 'planes_admin', etiqueta: 'Gestionar plan y suscripción' },
    ],
  },
];

export const TODOS_LOS_PERMISOS = GRUPOS_PERMISOS.flatMap((g) => g.items.map((i) => i.clave));
