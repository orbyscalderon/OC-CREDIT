import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlanesService } from './planes.service';

@Injectable()
export class PlanesScheduler {
  private readonly logger = new Logger(PlanesScheduler.name);

  constructor(private readonly planesService: PlanesService) {}

  /**
   * Corre una vez al día -- cobra a la tarjeta guardada los tenants cuya
   * prueba gratis de 7 días venció y todavía no pagaron.
   * CRON: 0 6 * * *
   */
  @Cron('0 6 * * *', { name: 'cobro-prueba-vencida' })
  async cobrarPruebasVencidas(): Promise<void> {
    try {
      const { cobrados, fallidos, notificados } = await this.planesService.cobrarPruebasVencidas();
      if (cobrados || fallidos || notificados) {
        this.logger.log(`Pruebas vencidas: ${cobrados} cobros exitosos, ${fallidos} fallidos, ${notificados} avisos enviados (sin tarjeta).`);
      }
    } catch (err) {
      this.logger.error(
        `Error en scheduler de cobro de pruebas vencidas: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
