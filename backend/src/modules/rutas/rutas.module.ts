import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';
import { Ruta } from './entities/ruta.entity';
import { NovedadRuta } from './entities/novedad-ruta.entity';
import { HistorialCobradorRuta } from './entities/historial-cobrador-ruta.entity';
import { Empleado } from '../usuarios/entities/empleado.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ruta, NovedadRuta, HistorialCobradorRuta, Empleado])],
  controllers: [RutasController],
  providers: [RutasService],
  exports: [TypeOrmModule],
})
export class RutasModule {}
