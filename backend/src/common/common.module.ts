import { Global, Module } from '@nestjs/common';
import { ZonaHorariaService } from './services/zona-horaria.service';
import { StorageService } from './services/storage.service';
import { EmailService } from './services/email.service';
import { GooglePlayBillingService } from './services/google-play-billing.service';

/** Global: cualquier módulo puede inyectar estos servicios sin importar este módulo explícitamente. */
@Global()
@Module({
  providers: [ZonaHorariaService, StorageService, EmailService, GooglePlayBillingService],
  exports: [ZonaHorariaService, StorageService, EmailService, GooglePlayBillingService],
})
export class CommonModule {}
