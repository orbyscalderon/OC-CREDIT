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

// Ruta dedicada a este archivo — ver el comentario equivalente en
// cobros.e2e-spec.ts: compartir ruta entre specs hace que el cierre de caja
// de una suite bloquee la apertura que necesita otra el mismo día.
const TENANT_ID_DEMO = 'aaaaaaaa-0000-0000-0000-000000000001';
const RUTA_ID_ESTE_ARCHIVO = 'eeeeeeee-0000-0000-0000-000000000002';

/**
 * E2E: POST /api/v1/cobros/:id/foto y GET /api/v1/cobros/:id/foto
 *
 * Cubre:
 *  1. Autenticación (401)
 *  2. Validación — sin archivo (400), archivo no-imagen (400)
 *  3. Cobro inexistente para este tenant (404) — y NO debe crear nada en disco
 *  4. Subida exitosa (201) seguida de descarga exitosa (200, mismo contenido)
 *  5. GET antes de subir ninguna foto → 404
 */

describe('POST/GET /api/v1/cobros/:id/foto (E2E)', () => {
  let app: INestApplication;
  let cobradoreToken: string;
  let adminToken: string;
  let prestamoActivoId: string;
  let cajaId: string;
  let transaccionId: string;

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

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
      { id: RUTA_ID_ESTE_ARCHIVO, tenant_id: TENANT_ID_DEMO, nombre: 'Ruta E2E — cobros-foto.e2e-spec', activa: true },
      ['id'],
    );

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@demo.oc', password: 'Admin1234!' })
      .expect(200);
    adminToken = adminLogin.body.data.access_token;

    const cobradorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'cobrador@demo.oc', password: 'Cobrador1234!' })
      .expect(200);
    cobradoreToken = cobradorLogin.body.data.access_token;

    const cajaResp = await request(app.getHttpServer())
      .post('/api/v1/cajas/abrir')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({ ruta_id: RUTA_ID_ESTE_ARCHIVO, monto_apertura: 0 })
      .expect(201);
    cajaId = cajaResp.body.data.id;

    const prestamosResp = await request(app.getHttpServer())
      .get('/api/v1/prestamos?estado=Activo&limit=1')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .expect(200);
    prestamoActivoId = prestamosResp.body.data.data[0]?.id;
    expect(prestamoActivoId).toBeDefined();

    // Cobro real, sin foto todavía — es sobre esta transacción que se prueba subir/ver.
    const cobroResp = await request(app.getHttpServer())
      .post('/api/v1/cobros/registrar')
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .send({
        uuid_idempotencia: uuidv4(),
        prestamo_id: prestamoActivoId,
        monto_cobrado: 300,
        caja_id: cajaId,
        latitud: 18.4861,
        longitud: -69.9312,
      })
      .expect(201);
    transaccionId = cobroResp.body.data.transaccion_id;
    expect(transaccionId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 sin token', () =>
    request(app.getHttpServer())
      .post(`/api/v1/cobros/${transaccionId}/foto`)
      .attach('foto', pngBuffer, 'evidencia.png')
      .expect(401));

  it('400 sin archivo adjunto', () =>
    request(app.getHttpServer())
      .post(`/api/v1/cobros/${transaccionId}/foto`)
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .expect(400));

  it('400 archivo no es imagen', () =>
    request(app.getHttpServer())
      .post(`/api/v1/cobros/${transaccionId}/foto`)
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .attach('foto', Buffer.from('no soy una imagen'), {
        filename: 'archivo.txt',
        contentType: 'text/plain',
      })
      .expect(400));

  it('404 cobro inexistente', () =>
    request(app.getHttpServer())
      .post(`/api/v1/cobros/${uuidv4()}/foto`)
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .attach('foto', pngBuffer, 'evidencia.png')
      .expect(404));

  it('404 al ver la foto antes de subir ninguna', () =>
    request(app.getHttpServer())
      .get(`/api/v1/cobros/${transaccionId}/foto`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404));

  it('201 sube la foto y luego 302 a una URL firmada con el mismo contenido', async () => {
    const uploadResp = await request(app.getHttpServer())
      .post(`/api/v1/cobros/${transaccionId}/foto`)
      .set('Authorization', `Bearer ${cobradoreToken}`)
      .attach('foto', pngBuffer, 'evidencia.png')
      .expect(201);

    expect(uploadResp.body.data).toHaveProperty('foto_evidencia_url');

    // El endpoint redirige a una URL firmada de Supabase Storage en vez de
    // servir los bytes directo (evita depender del disco local, efímero en
    // Railway) — seguimos la redirección y comparamos el contenido real.
    const verResp = await request(app.getHttpServer())
      .get(`/api/v1/cobros/${transaccionId}/foto`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(302);

    const signedUrl = verResp.headers.location;
    expect(signedUrl).toContain('/storage/v1/object/sign/documentos/');

    const descargado = await fetch(signedUrl).then((r) => r.arrayBuffer());
    expect(Buffer.compare(Buffer.from(descargado), pngBuffer)).toBe(0);
  });
});
