import { Rol } from './roles.enum';

/**
 * Catálogo de permisos granulares. Reemplaza el chequeo directo por `rol`
 * en los controllers -- cada endpoint ahora exige uno o más `Permiso`, no
 * un `Rol` crudo. Por defecto, cada empleado tiene los permisos de su rol
 * base (ver PERMISOS_POR_ROL); un admin puede personalizarlos por empleado
 * (usuarios.permisos_custom), y ahí esos reemplazan por completo al set
 * por defecto del rol.
 */
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

/** Set de permisos por defecto de cada rol base -- el punto de partida antes de cualquier personalización. */
export const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  [Rol.ADMIN_TENANT]: Object.values(Permiso),

  [Rol.SUPERVISOR_TENANT]: [
    Permiso.CLIENTES_VER, Permiso.CLIENTES_CREAR, Permiso.CLIENTES_EDITAR,
    Permiso.PRESTAMOS_VER, Permiso.PRESTAMOS_SOLICITAR,
    Permiso.COBROS_REGISTRAR,
    Permiso.CAJAS_OPERAR, Permiso.CAJAS_SUPERVISAR,
    Permiso.RUTAS_GESTIONAR,
    Permiso.NOVEDADES_REGISTRAR, Permiso.NOVEDADES_VER,
    Permiso.BURO_CONSULTAR, Permiso.BURO_REPORTAR,
    Permiso.REPORTES_VER, Permiso.REPORTES_AVANZADOS,
    Permiso.EMPLEADOS_VER,
    Permiso.TENANT_VER_CONFIG,
  ],

  [Rol.COBRADOR_TENANT]: [
    Permiso.CLIENTES_CREAR,
    Permiso.PRESTAMOS_VER, Permiso.PRESTAMOS_SOLICITAR,
    Permiso.COBROS_REGISTRAR,
    Permiso.CAJAS_OPERAR,
    Permiso.RUTAS_VER_PROPIA,
    Permiso.NOVEDADES_REGISTRAR,
    Permiso.BURO_CONSULTAR,
    Permiso.REPORTES_VER,
  ],
};

/** Permisos efectivos de un usuario: personalizados si los tiene, si no los de su rol base. */
export function permisosEfectivos(rol: Rol, permisosCustom: string[] | null | undefined): Permiso[] {
  if (permisosCustom && permisosCustom.length > 0) return permisosCustom as Permiso[];
  return PERMISOS_POR_ROL[rol] ?? [];
}
