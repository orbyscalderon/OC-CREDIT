import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MoraService } from './mora.service';

@Injectable()
export class MoraScheduler {
  private readonly logger = new Logger(MoraScheduler.name);

  constructor(private readonly moraService: MoraService) {}

  /**
   * Corre cada hora en punto (a los :05) y calcula mora solo para los
   * tenants cuya hora local sea medianoche en ese momento — equivalente al
   * antiguo "5 0 * * 1-6 hora RD" pero evaluado por tenant, no globalmente.
   * CRON: 5 * * * *
   */
  @Cron('5 * * * *', { name: 'calcular-mora-diaria' })
  async calcularMoraDiaria(): Promise<void> {
    try {
      await this.moraService.calcularMoraTenantsEnVentana();
    } catch (err) {
      this.logger.error(
        `Error en scheduler de mora: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
