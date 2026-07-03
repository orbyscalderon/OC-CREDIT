import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E: Cajas — apertura, cierre ciego, arqueo
 *
 * Cubre:
 *  1. Apertura idempotente
 *  2. Cierre ciego: cobrador recibe solo {mensaje}, SIN diferencia_cierre
 *  3. Arqueo con diferencia visible SOLO para admin_tenant
 *  4. Cobrador NO puede ver diferencia ni estado_cuadre en arqueo
 */

describe('Cajas E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let cobradoreToken: string;
  let cajaId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const a = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.oc', password: 'Test1234!' })
      .expect(200);
    adminToken = a.body.data.access_token;

    const c = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cobrador@test.oc', password: 'Test1234!' })
      .expect(200);
    cobradoreToken = c.body.data.access_token;
  });

  afterAll(() => app.close());

  describe('POST /api/v1/cajas/abrir', () => {
    it('Abre caja y retorna ID', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/cajas/abrir')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ monto_apertura: 500 })
        .expect(201);
      cajaId = resp.body.data.id;
      expect(cajaId).toBeDefined();
      expect(resp.body.data.estado).toBe('Abierta');
    });

    it('Segunda llamada retorna la MISMA caja (idempotente)', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/cajas/abrir')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ monto_apertura: 999 }) // monto diferente, debe ignorarse
        .expect(201);
      expect(resp.body.data.id).toBe(cajaId);
    });
  });

  describe('POST /api/v1/cajas/:id/cerrar', () => {
    it('Cobrador cierra caja — respuesta SIN diferencia_cierre (blind close)', async () => {
      const resp = await request(app.getHttpServer())
        .post(`/api/v1/cajas/${cajaId}/cerrar`)
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ monto_cierre_declarado: 450 })
        .expect(200);

      // El cobrador NO debe recibir diferencia ni estado_cuadre
      expect(resp.body.data).not.toHaveProperty('diferencia_cierre');
      expect(resp.body.data).not.toHaveProperty('estado_cuadre');
      expect(resp.body.data.mensaje).toBeTruthy();
    });

    it('No puede cerrar dos veces la misma caja', () =>
      request(app.getHttpServer())
        .post(`/api/v1/cajas/${cajaId}/cerrar`)
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ monto_cierre_declarado: 450 })
        .expect(409));
  });

  describe('GET /api/v1/cajas/:id/arqueo', () => {
    it('Admin SÍ recibe diferencia_cierre y estado_cuadre', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/api/v1/cajas/${cajaId}/arqueo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resp.body.data).toHaveProperty('diferencia_cierre');
      expect(resp.body.data).toHaveProperty('estado_cuadre');
      // 500 apertura + 0 cobros - 0 gastos = 500 esperado; declarado = 450 → diferencia = -50
      expect(resp.body.data.diferencia_cierre).toBe(-50);
      expect(resp.body.data.estado_cuadre).toBe('Faltante');
    });

    it('Cobrador NO recibe diferencia_cierre', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/api/v1/cajas/${cajaId}/arqueo`)
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .expect(200);

      expect(resp.body.data).not.toHaveProperty('diferencia_cierre');
      expect(resp.body.data).not.toHaveProperty('estado_cuadre');
    });
  });
});
