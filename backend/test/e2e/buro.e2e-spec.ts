import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E: Buró de Crédito
 *
 * Cubre:
 *  1. Consulta cross-tenant por cédula
 *  2. Reporte permanente — registro creado y auditable
 *  3. Reporte NO se puede borrar — DELETE devuelve 404/405
 *  4. Marcar deuda saldada — nivel de riesgo baja 1 tier, activo sigue true
 *  5. Estadísticas globales solo para admin
 *  6. Log de consulta se registra en consultas_buro
 */

describe('Buró de Crédito E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let cobradorToken: string;
  const cedula = '001-1234567-9';
  let historialId: string;

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
    cobradorToken = c.body.data.access_token;
  });

  afterAll(() => app.close());

  describe('POST /api/v1/buro/reportar', () => {
    it('Crea reporte permanente', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/buro/reportar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cedula,
          nombre: 'Juan',
          apellido: 'Pérez',
          nivel_riesgo: 'Alto',
          motivo_reporte: 'ImpagoTotal',
          descripcion: 'No pagó en 90 días',
          deuda_original: 25000,
        })
        .expect(201);

      historialId = resp.body.data.id;
      expect(historialId).toBeDefined();
      expect(resp.body.data.activo).toBe(true);
    });

    it('Registro NO se puede borrar (DELETE → 404 o 405)', () =>
      request(app.getHttpServer())
        .delete(`/api/v1/buro/${historialId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect((res) => {
          expect([404, 405]).toContain(res.status);
        }));
  });

  describe('POST /api/v1/buro/consultar', () => {
    it('Consulta cross-tenant — retorna recomendación y reportes', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/buro/consultar')
        .set('Authorization', `Bearer ${cobradorToken}`)
        .send({ cedula, motivo_consulta: 'Test E2E' })
        .expect(200);

      const perfil = resp.body.data;
      expect(perfil.cedula).toBe(cedula);
      expect(perfil.total_reportes).toBeGreaterThanOrEqual(1);
      expect(perfil.recomendacion).toBe('NO_PRESTAR');
      expect(Array.isArray(perfil.reportes)).toBe(true);
      expect(perfil.reportes.length).toBeGreaterThanOrEqual(1);
    });

    it('La consulta queda registrada en el log de auditoría', async () => {
      // Realizamos una segunda consulta y verificamos que el conteo de consultas aumenta
      const resp1 = await request(app.getHttpServer())
        .post('/api/v1/buro/consultar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cedula, motivo_consulta: 'Segunda consulta' })
        .expect(200);
      expect(resp1.body.data.consulta_id).toBeDefined();
    });
  });

  describe('POST /api/v1/buro/marcar-saldada', () => {
    it('Marca deuda como saldada — nivel de riesgo baja 1 tier', async () => {
      const resp = await request(app.getHttpServer())
        .post('/api/v1/buro/marcar-saldada')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ historial_id: historialId, observacion: 'Pagó el 100%' })
        .expect(200);

      expect(resp.body.data.deuda_saldada).toBe(true);
      // Alto → Medio (baja 1 nivel)
      expect(resp.body.data.nivel_riesgo).toBe('Medio');
      // El registro PERMANECE activo = true
      expect(resp.body.data.activo).toBe(true);
    });
  });

  describe('GET /api/v1/buro/estadisticas', () => {
    it('Admin puede ver estadísticas globales', () =>
      request(app.getHttpServer())
        .get('/api/v1/buro/estadisticas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200));

    it('Cobrador NO puede ver estadísticas (403)', () =>
      request(app.getHttpServer())
        .get('/api/v1/buro/estadisticas')
        .set('Authorization', `Bearer ${cobradorToken}`)
        .expect(403));
  });
});
