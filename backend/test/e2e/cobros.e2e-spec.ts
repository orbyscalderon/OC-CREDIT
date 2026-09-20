import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { Ruta } from '../../src/modules/rutas/entities/ruta.entity';

// Ruta dedicada a este archivo (no la comparte con cajas/cobros-foto): el
// cierre de la caja del día es único por (tenant, cobrador, ruta, fecha), así
// que reutilizar la misma ruta entre specs hace que una suite cierre la caja
// que otra necesita abrir. Se crea vía upsert, no depende de ningún seed.
const TENANT_ID_DEMO = 'aaaaaaaa-0000-0000-0000-000000000001';
const RUTA_ID_ESTE_ARCHIVO = 'eeeeeeee-0000-0000-0000-000000000001';

/**
 * E2E: POST /api/v1/cobros/registrar
 *
 * Cubre:
 *  1. Autenticación y autorización (401, 403)
 *  2. Validación de DTO (400)
 *  3. Cobro exitoso con distribución de pago en cascada
 *  4. Idempotencia — segunda llamada con mismo UUID → 409
 *  5. Préstamo inexistente → 404
 */

describe('POST /api/v1/cobros/registrar (E2E)', () => {
  let app: INestApplication;
  let cobradoreToken: string;
  let adminToken: string;
  let prestamoActivoId: string;
  let cajaId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    const em = moduleRef.get<EntityManager>(getEntityManagerToken());
    await em.upsert(
      Ruta,
      { id: RUTA_ID_ESTE_ARCHIVO, tenant_id: TENANT_ID_DEMO, nombre: 'Ruta E2E — cobros.e2e-spec', activa: true },
      ['id'],
    );

    // 1. Login como admin para obtener IDs de setup
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.oc', password: 'Admin1234!' })
      .expect(200);
    adminToken = adminLogin.body.data.access_token;

    // 2. Login como cobrador
    const cobradorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cobrador@demo.oc', password: 'Cobrador1234!' })
      .expect(200);
    cobradoreToken = cobradorLogin.body.data.access_token;

    // 3. Abrir caja del cobrador
    const cajaResp = await request(app.getHttpServer())
      .post('/api/v1/cajas/abrir')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({ ruta_id: RUTA_ID_ESTE_ARCHIVO, monto_apertura: 0 })
      .expect(201);
    cajaId = cajaResp.body.data.id;

    // 4. Obtener un préstamo Activo del tenant de prueba
    const prestamosResp = await request(app.getHttpServer())
      .get('/api/v1/prestamos?estado=Activo&limit=1')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .expect(200);
    prestamoActivoId = prestamosResp.body.data.data[0]?.id;
    expect(prestamoActivoId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 sin token', () =>
    request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .send({})
      .expect(401));

  it('400 DTO inválido — monto negativo', () =>
    request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuidv4(),
        prestamo_id: prestamoActivoId,
        monto_cobrado: -100,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(400));

  it('400 DTO inválido — uuid_idempotencia faltante', () =>
    request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        prestamo_id: prestamoActivoId,
        monto_cobrado: 500,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(400));

  it('404 préstamo inexistente', () =>
    request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuidv4(),
        prestamo_id: uuidv4(), // UUID válido pero no existe
        monto_cobrado: 500,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(404));

  it('201 cobro exitoso — distribución en cascada', async () => {
    const uuid = uuidv4();
    const resp = await request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuid,
        prestamo_id: prestamoActivoId,
        monto_cobrado: 500,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(201);

    const { data } = resp.body;
    expect(data).toHaveProperty('transaccion_id');
    expect(data).toHaveProperty('distribucion');

    // Cascada: mora → interés → capital
    const dist = data.distribucion;
    expect(dist).toHaveProperty('mora_absorbida');
    expect(dist).toHaveProperty('interes_absorbido');
    expect(dist).toHaveProperty('capital_absorbido');
    expect(
      dist.mora_absorbida + dist.interes_absorbido + dist.capital_absorbido + dist.excedente,
    ).toBeCloseTo(500, 1);
  });

  it('201 cobro exitoso sin GPS — cobro manual desde el panel web', async () => {
    // El endpoint limita a 5 cobros/seg por cobrador (@Throttle) -- el test
    // anterior ya consumió parte de la ventana, se espera a que abra una nueva.
    await new Promise((r) => setTimeout(r, 1100));
    const uuid = uuidv4();
    const resp = await request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuid,
        prestamo_id: prestamoActivoId,
        monto_cobrado: 100,
        caja_id: cajaId,
      })
      .expect(201);

    expect(resp.body.data).toHaveProperty('transaccion_id');
  });

  it('409 idempotencia — mismo UUID → DUPLICATE_UUID', async () => {
    // El endpoint tiene throttle de 5 req/seg (deliberado, ver auditoría de
    // seguridad); los tests anteriores ya consumieron ese cupo en el mismo
    // segundo, así que se espera a que se resetee antes de las 2 llamadas
    // de este test para no confundir "429 por límite" con el 409 real que
    // se está probando.
    await new Promise((r) => setTimeout(r, 1100));
    const uuid = uuidv4();

    // Primera llamada OK
    await request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuid,
        prestamo_id: prestamoActivoId,
        monto_cobrado: 500,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(201);

    // Segunda llamada con mismo UUID → 409
    const resp = await request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuid,
        prestamo_id: prestamoActivoId,
        monto_cobrado: 500,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(409);

    expect(resp.body.details.code).toBe('DUPLICATE_UUID');
    expect(resp.body.details).toHaveProperty('transaccion_id');
  });
});
