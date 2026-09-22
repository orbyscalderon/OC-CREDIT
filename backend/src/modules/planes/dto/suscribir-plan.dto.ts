import { IsIn, IsOptional, IsString } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class SuscribirPlanDto {
  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;

  // Token de Google Pay — opcional solo si el plan termina costando $0.
  @IsOptional() @IsString()
  googlePayToken?: string;

  // Alternativa a googlePayToken: id de un PaymentIntent ya confirmado del
  // lado del cliente (pago directo con tarjeta via Stripe Elements, sin
  // pasar por Google Pay). El backend verifica el estado y el monto contra
  // Stripe antes de aceptarlo.
  @IsOptional() @IsString()
  paymentIntentId?: string;
}
