import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import * as request from 'supertest';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
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

// Ruta sembrada por 003_seed_demo.sql, asignada al cobrador de prueba (Pedro).
const RUTA_ID_COBRADOR = 'dddddddd-0000-0000-0000-000000000001';

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
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    // Deja la suite re-ejecutable el mismo día: una caja cerrada no se puede
    // reabrir (regla de negocio real, ver cajas.service.ts#abrir), así que
    // sin este borrado una segunda corrida en el mismo día calendario
    // fallaría siempre en el primer test con 400.
    const em = moduleRef.get<EntityManager>(getEntityManagerToken());
    await em.query(
      `DELETE FROM transacciones WHERE caja_id IN (
         SELECT id FROM cajas WHERE ruta_id = $1 AND fecha = CURRENT_DATE
       )`,
      [RUTA_ID_COBRADOR],
    );
    await em.query(
      `DELETE FROM cajas WHERE ruta_id = $1 AND fecha = CURRENT_DATE`,
      [RUTA_ID_COBRADOR],
    );

    const a = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.oc', password: 'Admin1234!' })
      .expect(200);
    adminToken = a.body.data.access_token;

    const c = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cobrador@demo.oc', password: 'Cobrador1234!' })
      .expect(200);
    cobradoreToken = c.body.data.access_token;
  });

  afterAll(() => app.close());

  describe('POST /api/v1/cajas/abrir', () => {
    it('Abre caja y retorna ID', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/cajas/abrir')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ ruta_id: RUTA_ID_COBRADOR, monto_apertura: 500 })
        .expect(201);
      cajaId = resp.body.data.id;
      expect(cajaId).toBeDefined();
      expect(resp.body.data.estado).toBe('Abierta');
    });

    it('Segunda llamada retorna la MISMA caja (idempotente)', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/cajas/abrir')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ ruta_id: RUTA_ID_COBRADOR, monto_apertura: 999 }) // monto diferente, debe ignorarse
        .expect(201);
      expect(resp.body.data.id).toBe(cajaId);
    });
  });

  describe('POST /api/v1/cajas/:id/cerrar', () => {
    it('Cobrador cierra caja — respuesta SIN diferencia_cierre (blind close)', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/cajas/cerrar')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ caja_id: cajaId, monto_cierre_declarado: 450 })
        .expect(200);

      // El cobrador NO debe recibir diferencia ni estado_cuadre
      expect(resp.body.data).not.toHaveProperty('diferencia_cierre');
      expect(resp.body.data).not.toHaveProperty('estado_cuadre');
      expect(resp.body.data.mensaje).toBeTruthy();
    });

    it('No puede cerrar dos veces la misma caja', () =>
      // cerrar() busca la caja con estado=ABIERTA; una ya cerrada simplemente
      // no matchea ese filtro, así que el backend responde 404 (no 409).
      request(app.getHttpServer())
        .post('/api/v1/cajas/cerrar')
        .set('Authorization', `Bearer ${cobradoreToken}`)
        .send({ caja_id: cajaId, monto_cierre_declarado: 450 })
        .expect(404));
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
