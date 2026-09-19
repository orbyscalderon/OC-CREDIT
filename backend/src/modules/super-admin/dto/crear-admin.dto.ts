import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class CrearAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Length(1, 150)
  nombre: string;
}
