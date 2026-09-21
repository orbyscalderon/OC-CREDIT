import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;        // usuario_id
  tenantId: string;
  empleadoId: string;
  rol: string;
  permisos: string[]; // efectivos: personalizados si los tiene, si no los del rol base -- ver permisos.enum.ts
  email: string;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
