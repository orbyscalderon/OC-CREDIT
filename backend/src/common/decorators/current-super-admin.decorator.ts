import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SuperAdminJwtPayload } from '../../modules/super-admin/super-admin-auth.service';

export const CurrentSuperAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SuperAdminJwtPayload => {
    return ctx.switchToHttp().getRequest().superAdmin;
  },
);
