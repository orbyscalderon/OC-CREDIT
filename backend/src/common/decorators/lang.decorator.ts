import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type Idioma = 'es' | 'en';

/**
 * Idioma del cliente, leído de Accept-Language (el frontend lo manda en cada
 * request según el idioma activo en i18next). Default 'es' -- cualquier otro
 * valor (o ausencia del header) cae ahí, nunca se propaga un idioma inválido
 * a los mensajes armados a mano en los services.
 */
export const Lang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Idioma => {
    const request = ctx.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.['accept-language'];
    return header?.toLowerCase().startsWith('en') ? 'en' : 'es';
  },
);
