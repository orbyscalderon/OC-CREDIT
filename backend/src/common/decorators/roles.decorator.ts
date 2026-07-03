import { SetMetadata } from '@nestjs/common';
import { Rol } from '../constants/roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
