import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Cliente } from './entities/cliente.entity';
import { Ruta } from '../rutas/entities/ruta.entity';
import { BuroCreditoModule } from '../buro-credito/buro-credito.module';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, Ruta]), BuroCreditoModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [TypeOrmModule],
})
export class ClientesModule {}
