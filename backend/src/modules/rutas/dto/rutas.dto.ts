import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsNumber,
  IsOptional, IsString, Length, Max, Min,
} from 'class-validator';
import { TipoNovedad } from '../../../common/constants/roles.enum';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class CrearRutaDto {
  @ApiProperty({ example: 'Ruta Norte - Zona 1' })
  @IsString()
  @Length(1, 100)
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'Los Alcarrizos' })
  @IsOptional()
  @IsString()
  zona?: string;

  @ApiPropertyOptional({ description: 'Cobrador asignado a la ruta' })
  @IsOptional()
  @IsUuidLike()
  cobrador_id?: string;

  @ApiPropertyOptional({ description: 'Color hex para el mapa', example: '#E91E63' })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  color_mapa?: string;
}

export class ToggleActivaRutaDto {
  @ApiProperty({ description: 'true para reactivar, false para desactivar' })
  @IsBoolean()
  activa: boolean;
}

export class RegistrarNovedadDto {
  @ApiProperty({ description: 'UUID del dispositivo para idempotencia' })
  @IsUuidLike()
  uuid_idempotencia: string;

  @ApiProperty({ description: 'ID del cliente que no pagó' })
  @IsUuidLike()
  cliente_id: string;

  @ApiPropertyOptional({ description: 'ID del préstamo relacionado' })
  @IsOptional()
  @IsUuidLike()
  prestamo_id?: string;

  @ApiProperty({ description: 'ID de la caja activa del cobrador' })
  @IsUuidLike()
  caja_id: string;

  @ApiProperty({ enum: TipoNovedad })
  @IsEnum(TipoNovedad)
  tipo: TipoNovedad;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Latitud GPS — OBLIGATORIO para validar visita física' })
  @IsNumber()
  @Min(-90) @Max(90)
  latitud: number;

  @ApiProperty({ description: 'Longitud GPS — OBLIGATORIO' })
  @IsNumber()
  @Min(-180) @Max(180)
  longitud: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  precision_gps?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  foto_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sincronizado_offline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  timestamp_dispositivo?: string;
}
