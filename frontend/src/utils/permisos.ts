// Espejo del catálogo del backend (backend/src/common/constants/permisos.enum.ts)
// -- valores textuales, no hace falta mantenerlos 100% sincronizados en
// tiempo real (el backend siempre valida), pero deben coincidir para que
// los checkboxes realmente activen/desactiven lo que dicen.

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
