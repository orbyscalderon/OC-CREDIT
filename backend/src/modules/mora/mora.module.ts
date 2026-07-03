import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoraService } from './mora.service';
import { MoraScheduler } from './mora.scheduler';
import { CargoMora } from './entities/cargo-mora.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CargoMora])],
  providers: [MoraService, MoraScheduler],
  exports: [MoraService, TypeOrmModule],
})
export class MoraModule {}
