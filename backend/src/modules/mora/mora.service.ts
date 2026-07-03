import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CargoMora } from './entities/cargo-mora.entity';
import { EstadoCargoMora } from '../../common/constants/roles.enum';

@Injectable()
export class MoraService {
  private readonly logger = new Logger(MoraService.name);

  constructor(
    @InjectRepository(CargoMora) private readonly moraRepo: Repository<CargoMora>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  /**
   * Calcula y registra mora para todos los tenants activos.
   * Usa la función PL/pgSQL fn_calcular_mora() definida en la migración.
   * Se invoca desde el scheduler cada día a las 00:05.
   */
  async calcularMoraTodosLosTenants(): Promise<void> {
    const tenants = await this.em.query<{ id: string; nombre_empresa: string }[]>(
      `SELECT id, nombre_empresa FROM tenants WHERE activo = TRUE`,
    );

    let totalRegistros = 0;

    for (const tenant of tenants) {
      try {
        const result = await this.em.query<{ fn_calcular_mora: string }[]>(
          `SELECT fn_calcular_mora($1) AS fn_calcular_mora`,
          [tenant.id],
        );
        const count = parseInt(result[0]?.fn_calcular_mora ?? '0', 10);
        totalRegistros += count;

        if (count > 0) {
          this.logger.log(
            `Mora calculada: tenant="${tenant.nombre_empresa}" → ${count} nuevos cargos`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Error calculando mora para tenant ${tenant.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Cálculo de mora completado. Total cargos generados: ${totalRegistros}`);
  }

  async obtenerMorasPrestamo(tenantId: string, prestamoId: string) {
    return this.moraRepo.find({
      where: { tenant_id: tenantId, prestamo_id: prestamoId },
      order: { fecha_generacion: 'ASC' },
    });
  }

  async condonarMora(tenantId: string, moraId: string): Promise<void> {
    await this.moraRepo.update(
      { id: moraId, tenant_id: tenantId },
      { estado: EstadoCargoMora.CONDONADO },
    );
  }

  async resumenMoraTenant(tenantId: string) {
    const [resumen] = await this.em.query<any[]>(`
      SELECT
        COUNT(DISTINCT prestamo_id) FILTER (WHERE estado = 'Pendiente') AS total_prestamos_en_mora,
        COALESCE(SUM(monto_mora - monto_pagado) FILTER (WHERE estado = 'Pendiente'), 0) AS mora_total_pendiente,
        COALESCE(MAX(dias_mora), 0) AS max_dias_mora
      FROM cargos_mora
      WHERE tenant_id = $1
    `, [tenantId]);

    const detalle = await this.em.query<any[]>(`
      SELECT
        cm.prestamo_id,
        cl.nombre  AS cliente_nombre,
        cl.apellido AS cliente_apellido,
        cl.cedula,
        MAX(cm.dias_mora)                                    AS dias_mora,
        SUM(cm.monto_mora - cm.monto_pagado)                 AS mora_pendiente
      FROM cargos_mora cm
      JOIN prestamos   p  ON p.id  = cm.prestamo_id
      JOIN clientes    cl ON cl.id = p.cliente_id
      WHERE cm.tenant_id = $1 AND cm.estado = 'Pendiente'
      GROUP BY cm.prestamo_id, cl.nombre, cl.apellido, cl.cedula
      ORDER BY dias_mora DESC
      LIMIT 50
    `, [tenantId]);

    return {
      total_prestamos_en_mora: Number(resumen.total_prestamos_en_mora ?? 0),
      mora_total_pendiente:    Number(resumen.mora_total_pendiente    ?? 0),
      max_dias_mora:           Number(resumen.max_dias_mora           ?? 0),
      detalle: detalle.map(d => ({
        prestamo_id:      d.prestamo_id,
        cliente_nombre:   d.cliente_nombre,
        cliente_apellido: d.cliente_apellido,
        cedula:           d.cedula ?? null,
        dias_mora:        Number(d.dias_mora),
        mora_pendiente:   Number(d.mora_pendiente),
      })),
    };
  }
}
