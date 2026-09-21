import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class OlvidePasswordDto {
  @ApiProperty({ example: 'admin@miagencia.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}

export class ResetearPasswordDto {
  @ApiProperty({ description: 'Token recibido en el link del email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'miPasswordNueva123' })
  @IsString()
  @MinLength(8)
  nueva_password: string;
}
