import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

const BUCKET = 'documentos';
const SIGNED_URL_TTL_SEGUNDOS = 300;

/**
 * Sube/lee archivos privados (cédulas, evidencia de cobro) en Supabase
 * Storage usando la service_role key -- ignora RLS, mismo patrón de
 * confianza que usa TypeORM para la base de datos (acceso solo desde el
 * backend, nunca expuesto directo al navegador/app).
 *
 * Reemplaza el disco local (diskStorage/fs.writeFile a /var/www/...) que
 * se perdía en cada redeploy de Railway (filesystem efímero).
 *
 * Usa axios (HTTP directo a la REST API de Storage) en vez del cliente
 * @supabase/supabase-js: ese cliente depende del `fetch` global de Node
 * para subir binarios, y en Node 20 (la imagen del Dockerfile) eso tumbaba
 * el proceso completo -- funcionaba bien en local con Node 24 pero crasheaba
 * en Railway. axios usa los módulos http/https nativos, sin esa dependencia.
 */
@Injectable()
export class StorageService {
  private readonly http: AxiosInstance;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas -- requeridas para subir/leer documentos',
      );
    }
    this.http = axios.create({
      baseURL: `${url}/storage/v1`,
      headers: { Authorization: `Bearer ${key}`, apikey: key },
      timeout: 15_000,
    });
  }

  async subir(path: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      await this.http.post(`/object/${BUCKET}/${path}`, buffer, {
        headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
        maxBodyLength: Infinity,
      });
      return path;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err);
      throw new InternalServerErrorException(`Error subiendo archivo: ${msg}`);
    }
  }

  async urlFirmada(path: string): Promise<string> {
    try {
      const { data } = await this.http.post<{ signedURL: string }>(
        `/object/sign/${BUCKET}/${path}`,
        { expiresIn: SIGNED_URL_TTL_SEGUNDOS },
      );
      return `${this.http.defaults.baseURL}${data.signedURL}`;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? JSON.stringify(err.response?.data ?? err.message) : String(err);
      throw new InternalServerErrorException(`Error generando URL firmada: ${msg}`);
    }
  }
}
