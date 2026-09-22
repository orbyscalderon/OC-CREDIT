import { IsIn, IsOptional } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class CrearPaymentIntentDto {
  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;
}
