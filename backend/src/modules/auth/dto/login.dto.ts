import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@miagencia.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'miPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Token de acceso — entregado solo internamente al controller para la cookie' })
  access_token: string;

  @ApiProperty()
  usuario: {
    id: string;
    email: string;
    rol: string;
    nombre: string;
    apellido: string;
    empleado_id: string;
  };

  @ApiProperty({ description: 'Configuración visual del tenant para el cliente' })
  tenant_config: {
    tenant_id: string;
    nombre_empresa: string;
    url_logo: string;
    color_primario: string;
    color_secundario: string;
    color_acento: string;
    moneda: string;
    simbolo_moneda: string;
    zona_horaria: string;
    formato_fecha: string;
  };
}
