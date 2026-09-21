import { SetMetadata } from '@nestjs/common';
import { Permiso } from '../constants/permisos.enum';

export const PERMISOS_KEY = 'permisos';
/** Basta con tener UNO de los permisos listados (OR, no AND) -- mismo criterio que el @Roles() que reemplaza. */
export const RequierePermiso = (...permisos: Permiso[]) => SetMetadata(PERMISOS_KEY, permisos);
