import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BuroCreditoService } from './buro-credito.service';
import { esUltimoDiaDelMesEnZona, horaActualEnZona } from '../../common/utils/fecha-negocio.util';

@Injectable()
export class BuroCreditoScheduler {
  private readonly logger = new Logger(BuroCreditoScheduler.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly buroService: BuroCreditoService,
  ) {}

  /**
   * Corre cada hora en punto (a los :55) y, para cada tenant activo, actúa
   * solo si en SU zona horaria son las 11pm Y hoy es el último día del mes —
   * equivalente al antiguo "55 23 * * * hora RD" pero por tenant en vez de
   * global, para que un tenant en otro huso cierre su mes en su propia
   * medianoche y no en la de RD.
   */
  @Cron('55 * * * *', { name: 'buro-reporte-fin-mes' })
  async reporteFinDeMes(): Promise<void> {
    const tenants = await this.ds.query<{ id: string; nombre_empresa: string; zona_horaria: string }[]>(`
      SELECT t.id, t.nombre_empresa, COALESCE(ts.zona_horaria, 'America/Santo_Domingo') AS zona_horaria
      FROM tenants t LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
      WHERE t.activo = TRUE
    `);

    for (const tenant of tenants) {
      const hora = horaActualEnZona(tenant.zona_horaria);
      if (hora !== 23 || !esUltimoDiaDelMesEnZona(tenant.zona_horaria)) continue;

      this.logger.log(`=== Reporte mensual de atrasados al buró: tenant=${tenant.nombre_empresa} ===`);
      try {
        const resultado = await this.buroService.reportarAtrasadosFinMes(tenant.id);
        this.logger.log(
          `Reporte mensual finalizado tenant=${tenant.nombre_empresa} — ${resultado.reportes_creados} reportes`,
        );
      } catch (err) {
        this.logger.error(
          `Error en reporte mensual al buró para tenant=${tenant.nombre_empresa}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
  }

  /**
   * Corre cada hora en punto (a los :15, después del cálculo de mora a los
   * :05) y, para cada tenant activo, actúa solo si en SU zona horaria es
   * medianoche -- así se evalúa el umbral con la mora del día ya calculada.
   * Solo tiene efecto en tenants que configuraron
   * tenant_settings.dias_mora_reporte_auto (NULL = deshabilitado, default).
   */
  @Cron('15 * * * *', { name: 'buro-reporte-umbral-diario' })
  async reportePorUmbralDiario(): Promise<void> {
    const tenants = await this.ds.query<{ id: string; nombre_empresa: string; zona_horaria: string }[]>(`
      SELECT t.id, t.nombre_empresa, COALESCE(ts.zona_horaria, 'America/Santo_Domingo') AS zona_horaria
      FROM tenants t
      JOIN tenant_settings ts ON ts.tenant_id = t.id
      WHERE t.activo = TRUE AND ts.dias_mora_reporte_auto IS NOT NULL
    `);

    for (const tenant of tenants) {
      if (horaActualEnZona(tenant.zona_horaria) !== 0) continue;

      try {
        const resultado = await this.buroService.reportarPorUmbralDiario(tenant.id);
        if (resultado.reportes_creados > 0) {
          this.logger.log(
            `Reporte por umbral diario tenant=${tenant.nombre_empresa} — ${resultado.reportes_creados} reportes`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Error en reporte por umbral diario al buró para tenant=${tenant.nombre_empresa}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }
  }
}
