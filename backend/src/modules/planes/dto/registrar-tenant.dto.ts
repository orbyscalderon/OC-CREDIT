import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class RegistrarTenantDto {
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

  @IsOptional() @IsString() @Length(2, 2)
  pais?: string;

  @IsIn(PLANES_VALIDOS)
  plan_id: string;

  @IsOptional()
  facturacion_anual?: boolean;
}
