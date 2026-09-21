import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permiso } from '../constants/permisos.enum';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';
import { msg } from '../i18n/messages';

/**
 * Reemplaza a RolesGuard -- chequea contra los permisos EFECTIVOS del
 * usuario (embebidos en el JWT en login/getMe, ver auth.service.ts), no
 * contra su rol crudo. Esto es lo que hace posible personalizar qué puede
 * hacer un empleado puntual sin tocar su rol base.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Permiso[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requeridos || requeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const permisosUsuario = user.permisos ?? [];

    if (!requeridos.some((p) => permisosUsuario.includes(p))) {
      throw new ForbiddenException(
        msg('auth_acceso_denegado_permisos', { permisos: requeridos.join(', ') }),
      );
    }

    return true;
  }
}
