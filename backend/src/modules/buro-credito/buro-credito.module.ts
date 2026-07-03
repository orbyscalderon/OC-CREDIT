import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuroCreditoController } from './buro-credito.controller';
import { BuroCreditoService } from './buro-credito.service';
import { BuroCreditoScheduler } from './buro-credito.scheduler';
import { HistorialCredito } from './entities/historial-credito.entity';
import { ConsultaBuro } from './entities/consulta-buro.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialCredito, ConsultaBuro, Tenant])],
  controllers: [BuroCreditoController],
  providers: [BuroCreditoService, BuroCreditoScheduler],
  exports: [BuroCreditoService],
})
export class BuroCreditoModule {}
