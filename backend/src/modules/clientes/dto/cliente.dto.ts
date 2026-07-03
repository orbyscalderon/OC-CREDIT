import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsNumber, IsOptional, IsString,
  Length, Max, Min,
} from 'class-validator';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class CrearClienteDto {
  @ApiPropertyOptional({ description: 'ID de la ruta a la que se asigna' })
  @IsOptional()
  @IsUuidLike()
  ruta_id?: string;

  @ApiPropertyOptional({ description: 'Código interno (ej: CLI-001)' })
  @IsOptional()
  @IsString()
  codigo_cliente?: string;

  @ApiProperty({ example: 'María' })
  @IsString()
  @Length(1, 100)
  nombre: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  @Length(1, 100)
  apellido: string;

  @ApiPropertyOptional({ example: '001-1234567-8' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  cedula?: string;

  @ApiPropertyOptional({ example: '809-555-1234' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono_referencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre_referencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion_casa?: string;

  @ApiPropertyOptional({ description: 'Latitud de la casa para el mapa', example: 18.4861 })
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  latitud_casa?: number;

  @ApiPropertyOptional({ example: -69.9312 })
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  longitud_casa?: number;

  @ApiPropertyOptional({ description: 'Orden de visita en la ruta' })
  @IsOptional()
  @IsInt()
  orden_visita?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas_internas?: string;
}

export class ActualizarClienteDto extends CrearClienteDto {}
