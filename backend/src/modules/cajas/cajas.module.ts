import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajasController } from './cajas.controller';
import { CajasService } from './cajas.service';
import { Caja } from './entities/caja.entity';
import { Transaccion } from './entities/transaccion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Caja, Transaccion])],
  controllers: [CajasController],
  providers: [CajasService],
  exports: [CajasService, TypeOrmModule],
})
export class CajasModule {}
