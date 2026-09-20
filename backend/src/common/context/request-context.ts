import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import type { Idioma } from '../decorators/lang.decorator';

interface Ctx {
  lang: Idioma;
}

const als = new AsyncLocalStorage<Ctx>();

/**
 * Middleware global: lee Accept-Language una vez por request y lo deja
 * disponible en cualquier punto del código (servicios incluidos, sin
 * necesidad de pasar `lang` por parámetro a través de toda la cadena de
 * llamadas) vía getLang(). Basado en AsyncLocalStorage -- no hace falta
 * ninguna dependencia nueva.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['accept-language'];
  const lang: Idioma = typeof header === 'string' && header.toLowerCase().startsWith('en') ? 'en' : 'es';
  als.run({ lang }, next);
}

/** Idioma del request actual. Fuera de un request (jobs, scripts) cae en 'es'. */
export function getLang(): Idioma {
  return als.getStore()?.lang ?? 'es';
}
