import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BuroCreditoService } from './buro-credito.service';

@Injectable()
export class BuroCreditoScheduler {
  private readonly logger = new Logger(BuroCreditoScheduler.name);

  constructor(private readonly buroService: BuroCreditoService) {}

  /**
   * Reporte mensual de control: corre TODOS los días a las 11:55pm hora RD,
   * pero solo actúa si hoy es el último día calendario del mes (28-31 no
   * sirve como patrón cron porque varía por mes — se valida adentro contra
   * Postgres en vez de con aritmética de fechas en JS).
   * CRON: 55 23 * * *
   */
  @Cron('55 23 * * *', { name: 'buro-reporte-fin-mes', timeZone: 'America/Santo_Domingo' })
  async reporteFinDeMes(): Promise<void> {
    const esUltimoDia = await this.buroService.esUltimoDiaDelMes();
    if (!esUltimoDia) return;

    this.logger.log('=== SCHEDULER: Iniciando reporte mensual de atrasados al buró ===');
    try {
      const resultado = await this.buroService.reportarAtrasadosFinMes();
      this.logger.log(
        `=== SCHEDULER: Reporte mensual finalizado — ${resultado.reportes_creados} reportes en ${resultado.tenants_procesados} tenants ===`,
      );
    } catch (err) {
      this.logger.error(
        `Error en scheduler de reporte mensual al buró: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
