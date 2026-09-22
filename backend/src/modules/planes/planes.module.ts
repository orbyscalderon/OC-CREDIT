import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlanesController } from './planes.controller';
import { PlanesService } from './planes.service';
import { PlanesScheduler } from './planes.scheduler';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Usuario]),
    HttpModule,
    ConfigModule,
    AuthModule,
  ],
  controllers: [PlanesController],
  providers: [PlanesService, PlanesScheduler],
  exports: [PlanesService],
})
export class PlanesModule {}
