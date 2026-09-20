import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription-check.decorator';
import { msg } from '../i18n/messages';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly ds: DataSource,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  // Nota de tipos: la interfaz base declara handleRequest síncrono (TUser),
  // pero @nestjs/passport sí soporta (y espera) un handleRequest async en
  // runtime — por eso el retorno se tipa `any` y el trabajo async va en un
  // IIFE, para no pelear con el generic de la interfaz.
  handleRequest(err: Error, user: any, _info: any, context: ExecutionContext): any {
    return (async () => {
      if (err || !user) {
        throw new UnauthorizedException(msg('auth_token_invalido_expirado'));
      }

      const omitirChequeoSuscripcion = this.reflector.getAllAndOverride<boolean>(
        SKIP_SUBSCRIPTION_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!omitirChequeoSuscripcion && user.tenantId) {
        const rows = await this.ds.query(
          `SELECT fecha_prueba_hasta, fecha_vencimiento_suscripcion FROM tenants WHERE id = $1`,
          [user.tenantId],
        );
        if (rows.length) {
          const t = rows[0];
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          const pruebaVencida = t.fecha_prueba_hasta && new Date(t.fecha_prueba_hasta) < hoy;
          const sinSuscripcionVigente =
            !t.fecha_vencimiento_suscripcion || new Date(t.fecha_vencimiento_suscripcion) < hoy;

          if (pruebaVencida && sinSuscripcionVigente) {
            throw new HttpException(
              {
                code: 'TRIAL_EXPIRED',
                message: msg('auth_prueba_vencida'),
              },
              HttpStatus.PAYMENT_REQUIRED,
            );
          }
        }
      }

      return user;
    })();
  }
}
