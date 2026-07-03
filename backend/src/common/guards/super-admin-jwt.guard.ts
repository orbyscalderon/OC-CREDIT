import {
  CanActivate, ExecutionContext, Injectable,
  InternalServerErrorException, Logger, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SuperAdminJwtPayload } from '../../modules/super-admin/super-admin-auth.service';

@Injectable()
export class SuperAdminJwtGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const secret = this.config.get<string>('SUPER_ADMIN_JWT_SECRET');

    // Fail CLOSED: igual criterio que el guard anterior por clave estática —
    // sin secreto configurado, nadie entra.
    if (!secret) {
      this.logger.error('SUPER_ADMIN_JWT_SECRET no está configurada — acceso de super-admin bloqueado');
      throw new InternalServerErrorException(
        'Panel de super-admin no disponible: falta configurar SUPER_ADMIN_JWT_SECRET.',
      );
    }

    const req = ctx.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Token de super-admin requerido');
    }

    try {
      const payload = await this.jwtService.verifyAsync<SuperAdminJwtPayload>(token, { secret });
      if (payload.type !== 'super_admin') {
        throw new UnauthorizedException('Token inválido para este recurso');
      }
      req.superAdmin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de super-admin inválido o expirado');
    }
  }
}
