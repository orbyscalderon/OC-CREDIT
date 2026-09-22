import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class RegistroGoogleDto {
  // ID token de Google Identity Services (mismo que usa /auth/google)
  @IsNotEmpty() @IsString()
  credential: string;

  // PaymentMethod de Stripe (pm_...) confirmado en el frontend via
  // SetupIntent -- misma tarjeta-obligatoria-para-la-prueba que el
  // registro por email/password (registrarTenant valida en runtime si
  // Stripe está configurado).
  @IsOptional() @IsString()
  stripePaymentMethodId?: string;

  @IsString() @Length(3, 200)
  nombre_empresa: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsOptional() @IsString()
  ruc_cedula?: string;

  @IsOptional() @IsString() @Length(2, 2)
  pais?: string;

  @IsIn(PLANES_VALIDOS)
  plan_id: string;
}
