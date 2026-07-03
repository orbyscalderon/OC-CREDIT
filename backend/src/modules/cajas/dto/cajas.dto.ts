import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsISO8601, IsNotEmpty, IsNumber,
  IsOptional, IsPositive, IsString,
  Max, Min,
} from 'class-validator';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class AbrirCajaDto {
  @ApiProperty({ description: 'ID de la ruta del día' })
  @IsUuidLike()
  ruta_id: string;

  @ApiProperty({ description: 'Efectivo con el que inicia la jornada (fondo de cambio)', example: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_apertura: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  latitud?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  longitud?: number;
}

export class CerrarCajaDto {
  @ApiProperty({ description: 'ID de la caja a cerrar' })
  @IsUuidLike()
  caja_id: string;

  @ApiProperty({
    description: 'Efectivo físico contado por el cobrador. ' +
      'El cobrador NO ve la diferencia — ese dato es solo para Admin.',
    example: 4500,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_cierre_declarado: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90) @Max(90)
  latitud?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180) @Max(180)
  longitud?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nota_cierre?: string;
}

export class RegistrarGastoDto {
  @ApiProperty({ description: 'UUID único del dispositivo para idempotencia' })
  @IsUuidLike()
  uuid_idempotencia: string;

  @ApiProperty({ description: 'ID de la caja activa' })
  @IsUuidLike()
  caja_id: string;

  @ApiProperty({ description: 'Monto del gasto operativo', example: 150 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto: number;

  @ApiProperty({ description: 'Descripción del gasto (gasolina, reparación, etc.)' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ description: 'URL de la foto del comprobante físico' })
  @IsOptional()
  @IsString()
  foto_comprobante_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitud?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitud?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sincronizado_offline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  timestamp_dispositivo?: string;
}

export class ArqueoCajaResponseDto {
  caja_id: string;
  cobrador_nombre: string;
  ruta_nombre: string | null;
  fecha: string;
  estado: string;
  monto_apertura: number;
  total_cobros: number;
  total_gastos: number;
  monto_esperado: number;
  // Solo visible para Admin:
  monto_cierre_declarado?: number;
  diferencia_cierre?: number;
  estado_cuadre?: 'Cuadrado' | 'Sobrante' | 'Faltante';
}
