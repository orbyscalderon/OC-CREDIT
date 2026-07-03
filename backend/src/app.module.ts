import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RutasModule } from './modules/rutas/rutas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { PrestamosModule } from './modules/prestamos/prestamos.module';
import { CobrosModule } from './modules/cobros/cobros.module';
import { CajasModule } from './modules/cajas/cajas.module';
import { MoraModule } from './modules/mora/mora.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { BuroCreditoModule } from './modules/buro-credito/buro-credito.module';
import { PlanesModule } from './modules/planes/planes.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { PortalModule } from './modules/portal/portal.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),

    ScheduleModule.forRoot(),

    HealthModule,
    AuthModule,
    PlanesModule,
    BuroCreditoModule,
    TenantsModule,
    UsuariosModule,
    RutasModule,
    ClientesModule,
    PrestamosModule,
    CobrosModule,
    CajasModule,
    MoraModule,
    ReportesModule,
    WhatsappModule,
    PortalModule,
    SuperAdminModule,
  ],
  providers: [
    // ThrottlerModule.forRoot() solo registra la config — sin esto, el guard
    // nunca corre y los límites (y @Throttle() en los controllers) son ignorados.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
