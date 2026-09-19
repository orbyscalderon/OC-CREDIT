import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
 */
@Injectable()
export class StorageService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas -- requeridas para subir/leer documentos',
      );
    }
    this.client = createClient(url, key, { auth: { persistSession: false } });
  }

  async subir(path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) throw new InternalServerErrorException(`Error subiendo archivo: ${error.message}`);
    return path;
  }

  async urlFirmada(path: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SEGUNDOS);
    if (error || !data) {
      throw new InternalServerErrorException(`Error generando URL firmada: ${error?.message}`);
    }
    return data.signedUrl;
  }
}
