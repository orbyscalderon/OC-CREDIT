import { IsBoolean } from 'class-validator';

export class ToggleAdminActivoDto {
  @IsBoolean()
  activo: boolean;
}
