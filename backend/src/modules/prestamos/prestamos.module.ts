import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosController } from './prestamos.controller';
import { PrestamosService } from './prestamos.service';
import { Prestamo } from './entities/prestamo.entity';
import { CuotaAmortizacion } from './entities/cuota-amortizacion.entity';
import { CargoMora } from '../mora/entities/cargo-mora.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Ruta } from '../rutas/entities/ruta.entity';
import { BuroCreditoModule } from '../buro-credito/buro-credito.module';
import { PlanesModule } from '../planes/planes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prestamo, CuotaAmortizacion, CargoMora, Cliente, Tenant, Ruta]),
    BuroCreditoModule,
    PlanesModule,
  ],
  controllers: [PrestamosController],
  providers: [PrestamosService],
  exports: [PrestamosService, TypeOrmModule],
})
export class PrestamosModule {}
