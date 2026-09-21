import { Global, Module } from '@nestjs/common';
import { ZonaHorariaService } from './services/zona-horaria.service';
import { StorageService } from './services/storage.service';
import { EmailService } from './services/email.service';

/** Global: cualquier módulo puede inyectar estos servicios sin importar este módulo explícitamente. */
@Global()
@Module({
  providers: [ZonaHorariaService, StorageService, EmailService],
  exports: [ZonaHorariaService, StorageService, EmailService],
})
export class CommonModule {}
