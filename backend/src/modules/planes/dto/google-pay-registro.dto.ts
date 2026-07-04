import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

const PLANES_VALIDOS = ['free', 'personal', 'basico', 'profesional', 'avanzado', 'comercial', 'enterprise'];

export class GooglePayRegistroDto {
  // Datos de registro — igual que RegistrarTenantDto
  @IsString() @Length(3, 200)
  nombre_empresa: string;

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

  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;

  // Token de Google Pay con la información del pago
  @IsNotEmpty() @IsString()
  googlePayToken: string;

  // Monto confirmado desde el frontend (se re-valida en backend)
  @IsOptional()
  monto_usd?: number;
}
