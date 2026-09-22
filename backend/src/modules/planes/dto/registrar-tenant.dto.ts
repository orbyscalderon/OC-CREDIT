import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class RegistrarTenantDto {
  @IsString() @Length(3, 200)
  nombre_empresa: string;

  // PaymentMethod de Stripe (pm_...) confirmado en el frontend via
  // SetupIntent -- se guarda para cobrar automaticamente cuando venza la
  // prueba de 7 dias, no se cobra nada en el registro. Requerido solo en
  // el registro de prueba gratis (registrarTenant lo valida en runtime);
  // en GooglePayRegistroDto (que hereda de aca) no aplica porque ese
  // registro ya cobra de inmediato con un token de un solo uso.
  @IsOptional() @IsString()
  stripePaymentMethodId?: string;

  @IsEmail()
  email_admin: string;

  @IsString() @Length(6, 100)
  password: string;

  @IsString() @Length(3, 100)
  nombre_admin: string;

  @IsString() @Length(3, 100)
  apellido_admin: string;

  @IsOptional() @IsString()
  telefono?: string;

  @IsOptional() @IsString()
  ruc_cedula?: string;

  @IsOptional() @IsString() @Length(2, 2)
  pais?: string;

  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;
}
