import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsISO8601, IsNotEmpty, IsNumber,
  IsOptional, IsPositive, IsString, Max, Min,
} from 'class-validator';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class RegistrarCobroDto {
  @ApiProperty({
    description: 'UUID único generado en el dispositivo móvil. Garantiza idempotencia.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUuidLike()
  uuid_idempotencia: string;

  @ApiProperty({ description: 'ID del préstamo a cobrar' })
  @IsUuidLike()
  prestamo_id: string;

  @ApiProperty({ description: 'ID de la caja activa del cobrador' })
  @IsUuidLike()
  caja_id: string;

  @ApiProperty({ description: 'Monto en efectivo cobrado al cliente', example: 500.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9999999.99)
  monto_cobrado: number;

  @ApiPropertyOptional({ description: 'Latitud GPS del punto de cobro', example: 18.4861 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ description: 'Longitud GPS del punto de cobro', example: -69.9312 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiPropertyOptional({ description: 'Precisión del GPS en metros', example: 10.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  precision_gps?: number;

  @ApiPropertyOptional({ description: 'Descripción u observación del cobro' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'TRUE si el cobro fue registrado sin conexión a internet',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sincronizado_offline?: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp original del dispositivo (ISO 8601). Requerido si sincronizado_offline=true.',
    example: '2026-05-27T10:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  timestamp_dispositivo?: string;
}

export class CobroResponseDto {
  @ApiProperty()
  transaccion_id: string;

  @ApiProperty()
  prestamo_id: string;

  @ApiProperty({ description: 'Distribución exacta del pago aplicada' })
  distribucion: {
    mora_absorbida: number;
    interes_absorbido: number;
    capital_absorbido: number;
    excedente: number;
  };

  @ApiProperty({ description: 'Resumen del estado actual del préstamo' })
  prestamo_resumen: {
    estado: string;
    cuotas_pendientes: number;
    saldo_total_pendiente: number;
  };

  @ApiProperty()
  timestamp_procesado: string;
}
