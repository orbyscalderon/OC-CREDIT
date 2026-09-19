import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ZONA_HORARIA_DEFAULT } from '../utils/fecha-negocio.util';

const TTL_MS = 5 * 60 * 1000;

/**
 * Resuelve la zona horaria configurada de un tenant (tenant_settings.zona_horaria)
 * con un cache corto en memoria — se consulta en casi cada escritura de
 * negocio (cobros, cajas, préstamos, rutas, reportes) y ese dato cambia con
 * muy poca frecuencia (solo cuando el admin edita Configuración).
 */
@Injectable()
export class ZonaHorariaService {
  private readonly cache = new Map<string, { tz: string; expira: number }>();

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async obtener(tenantId: string): Promise<string> {
    const cacheada = this.cache.get(tenantId);
    if (cacheada && cacheada.expira > Date.now()) return cacheada.tz;

    const rows = await this.ds.query<{ zona_horaria: string }[]>(
      `SELECT zona_horaria FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId],
    );
    const tz = rows[0]?.zona_horaria ?? ZONA_HORARIA_DEFAULT;
    this.cache.set(tenantId, { tz, expira: Date.now() + TTL_MS });
    return tz;
  }

  /** Invalida el cache de un tenant — llamar al actualizar su zona horaria. */
  invalidar(tenantId: string): void {
    this.cache.delete(tenantId);
  }
}
