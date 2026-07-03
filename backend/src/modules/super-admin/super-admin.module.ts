import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtGuard } from '../../common/guards/super-admin-jwt.guard';
import { SuperAdmin } from './entities/super-admin.entity';
import { BuroCreditoModule } from '../buro-credito/buro-credito.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}), // sin secret por defecto — se pasa explícito en cada signAsync/verifyAsync
    TypeOrmModule.forFeature([SuperAdmin]),
    BuroCreditoModule,
  ],
  controllers: [SuperAdminController, SuperAdminAuthController],
  providers: [SuperAdminService, SuperAdminAuthService, SuperAdminJwtGuard],
})
export class SuperAdminModule {}
