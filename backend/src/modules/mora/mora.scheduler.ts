import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MoraService } from './mora.service';

@Injectable()
export class MoraScheduler {
  private readonly logger = new Logger(MoraScheduler.name);

  constructor(private readonly moraService: MoraService) {}

  /**
   * Calcula mora diariamente a las 00:05 (lunes a sábado).
   * Los domingos se omiten porque no se cobran los domingos.
   * CRON: 5 0 * * 1-6
   */
  @Cron('5 0 * * 1-6', { name: 'calcular-mora-diaria', timeZone: 'America/Santo_Domingo' })
  async calcularMoraDiaria(): Promise<void> {
    this.logger.log('=== SCHEDULER: Iniciando cálculo de mora diaria ===');
    try {
      await this.moraService.calcularMoraTodosLosTenants();
    } catch (err) {
      this.logger.error(
        `Error en scheduler de mora: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
    this.logger.log('=== SCHEDULER: Cálculo de mora finalizado ===');
  }
}
