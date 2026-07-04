import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

  app.use(cookieParser());

  app.use(helmet({ contentSecurityPolicy: true }));

  // '*' nunca debe combinarse con credentials:true (los navegadores lo
  // rechazan, y si algo lo "arregla" reflejando el origin literal sería un
  // CORS abierto real). Sin ALLOWED_ORIGINS definida, caer a un default
  // explícito de desarrollo en vez de un wildcard.
  app.enableCors({
    origin: config
      .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3002')
      .split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerCfg = new DocumentBuilder()
      .setTitle('OC Credit API')
      .setDescription(
        'Sistema de Préstamos y Cobranzas por Rutas\n© 2026 OC HOLDING GROUP LLC. Todos los derechos reservados.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'SuperAdminJWT',
      )
      .addTag('Auth', 'Autenticación y tokens')
      .addTag('Cobros', 'Registro de pagos en ruta')
      .addTag('Préstamos', 'Gestión de créditos')
      .addTag('Cajas', 'Control de efectivo diario')
      .addTag('Clientes', 'Base de clientes')
      .addTag('Rutas', 'Rutas de cobranza')
      .addTag('Reportes', 'Reportes y dashboards')
      .addTag('Tenants', 'Gestión de empresas (SaaS)')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerCfg);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║     OC CREDIT API - v1.0.0                       ║
  ║     © 2026 OC HOLDING GROUP LLC                     ║
  ║     Ambiente: ${config.get('NODE_ENV')?.padEnd(34)}║
  ║     Puerto  : ${String(port).padEnd(34)}║
  ╚══════════════════════════════════════════════════╝
  `);
}

bootstrap();
