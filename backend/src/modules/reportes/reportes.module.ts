import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { MoraModule } from '../mora/mora.module';
import { PlanesModule } from '../planes/planes.module';

@Module({
  imports: [MoraModule, PlanesModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
