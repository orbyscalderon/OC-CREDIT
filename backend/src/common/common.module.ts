import { Global, Module } from '@nestjs/common';
import { ZonaHorariaService } from './services/zona-horaria.service';

/** Global: cualquier módulo puede inyectar ZonaHorariaService sin importar este módulo explícitamente. */
@Global()
@Module({
  providers: [ZonaHorariaService],
  exports: [ZonaHorariaService],
})
export class CommonModule {}
