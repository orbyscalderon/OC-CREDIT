import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { TenantSettings } from '../modules/tenants/entities/tenant-settings.entity';
import { Usuario } from '../modules/usuarios/entities/usuario.entity';
import { Empleado } from '../modules/usuarios/entities/empleado.entity';
import { Ruta } from '../modules/rutas/entities/ruta.entity';
import { Cliente } from '../modules/clientes/entities/cliente.entity';
import { Prestamo } from '../modules/prestamos/entities/prestamo.entity';
import { CuotaAmortizacion } from '../modules/prestamos/entities/cuota-amortizacion.entity';
import { Caja } from '../modules/cajas/entities/caja.entity';
import { Transaccion } from '../modules/cajas/entities/transaccion.entity';
import { CargoMora } from '../modules/mora/entities/cargo-mora.entity';
import { NovedadRuta } from '../modules/rutas/entities/novedad-ruta.entity';
import { HistorialCredito } from '../modules/buro-credito/entities/historial-credito.entity';
import { ConsultaBuro } from '../modules/buro-credito/entities/consulta-buro.entity';
import { SuperAdmin } from '../modules/super-admin/entities/super-admin.entity';

export function getDatabaseConfig(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: config.get<number>('DATABASE_PORT', 5432),
    database: config.get<string>('DATABASE_NAME', 'oc_credit_db'),
    username: config.get<string>('DATABASE_USER'),
    password: config.get<string>('DATABASE_PASSWORD'),
    schema: config.get<string>('DATABASE_SCHEMA', 'public'),
    ssl: config.get<string>('DATABASE_SSL') === 'true'
      ? { rejectUnauthorized: true }
      : false,
    entities: [
      Tenant, TenantSettings,
      Usuario, Empleado,
      Ruta, NovedadRuta,
      Cliente,
      Prestamo, CuotaAmortizacion,
      Caja, Transaccion,
      CargoMora,
      HistorialCredito, ConsultaBuro,
      SuperAdmin,
    ],
    synchronize: false,        // Siempre FALSE en producción. Usar migraciones SQL.
    logging: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
    poolSize: config.get<number>('DATABASE_MAX_CONNECTIONS', 20),
    connectTimeoutMS: 5000,
    extra: {
      application_name: 'oc-credit-api',
      statement_timeout: 30000,
      // La sesión de Postgres viene en GMT por defecto, independiente de la
      // zona del proceso Node. Sin esto, CURRENT_DATE y DATE(timestamptz) en
      // todo el SQL crudo (aging, cuentas por cobrar, fn_calcular_mora) se
      // adelantan un día completo entre las 8pm y la medianoche hora RD.
      options: '-c timezone=America/Santo_Domingo',
    },
  };
}
