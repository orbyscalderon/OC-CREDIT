import { IsIn, IsOptional, IsString } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'pro'];

export class SuscribirPlanDto {
  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;

  // Token de Google Pay — opcional solo si el plan termina costando $0.
  @IsOptional() @IsString()
  googlePayToken?: string;
}
