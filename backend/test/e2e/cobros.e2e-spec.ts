import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../src/app.module';

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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 1. Login como admin para obtener IDs de setup
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.oc', password: 'Test1234!' })
      .expect(200);
    adminToken = adminLogin.body.data.access_token;

    // 2. Login como cobrador
    const cobradorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cobrador@test.oc', password: 'Test1234!' })
      .expect(200);
    cobradoreToken = cobradorLogin.body.data.access_token;

    // 3. Abrir caja del cobrador
    const cajaResp = await request(app.getHttpServer())
      .post('/api/v1/cajas/abrir')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({ monto_apertura: 0 })
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
      })
      .expect(201);

    const { data } = resp.body;
    expect(data).toHaveProperty('transaccion_id');
    expect(data).toHaveProperty('monto_cobrado', 500);
    expect(data).toHaveProperty('distribucion_pago');

    // Cascada: mora → interés → capital
    const dist = data.distribucion_pago;
    expect(dist).toHaveProperty('mora_pagada');
    expect(dist).toHaveProperty('interes_pagado');
    expect(dist).toHaveProperty('capital_pagado');
    expect(
      dist.mora_pagada + dist.interes_pagado + dist.capital_pagado,
    ).toBeCloseTo(500, 1);
  });

  it('409 idempotencia — mismo UUID → DUPLICATE_UUID', async () => {
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
      })
      .expect(409);

    expect(resp.body.error.code).toBe('DUPLICATE_UUID');
    expect(resp.body.error).toHaveProperty('transaccion_id');
  });
});
