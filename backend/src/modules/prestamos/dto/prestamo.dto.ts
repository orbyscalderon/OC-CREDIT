import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsPositive, IsString,
  Max, Min,
} from 'class-validator';
import { ModalidadPrestamo } from '../../../common/constants/roles.enum';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class CrearPrestamoDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUuidLike()
  cliente_id: string;

  @ApiProperty({ description: 'ID de la ruta a la que pertenece el cliente' })
  @IsUuidLike()
  ruta_id: string;

  @ApiProperty({ description: 'Monto solicitado', example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  capital_solicitado: number;

  @ApiProperty({ enum: ModalidadPrestamo })
  @IsEnum(ModalidadPrestamo)
  modalidad: ModalidadPrestamo;

  @ApiProperty({ description: 'Número de cuotas', example: 20 })
  @IsInt()
  @Min(1)
  @Max(360)
  numero_cuotas: number;

  @ApiPropertyOptional({
    description: 'Tasa de interés en porcentaje propuesta por el supervisor al solicitar ' +
      '(ej: 20 = 20%). Es solo una propuesta inicial — el admin decide la tasa final al aprobar.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.1)
  @Max(500)
  tasa_interes_propuesta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class AprobarPrestamoDto {
  @ApiProperty({ description: 'Capital aprobado (puede diferir del solicitado)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  capital_aprobado: number;

  @ApiProperty({ description: 'Tasa de interés en porcentaje sobre el capital. Ej: 20 = 20%' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.1)
  @Max(500)
  tasa_interes: number;

  @ApiProperty({ description: 'ID del cobrador asignado al préstamo' })
  @IsUuidLike()
  cobrador_id: string;

  @ApiProperty({ description: 'Fecha de primer pago (ISO 8601)', example: '2026-06-02' })
  @IsDateString()
  fecha_primer_pago: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class RechazarPrestamoDto {
  @ApiProperty({ description: 'Motivo del rechazo de la solicitud' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

export class RenovarPrestamoDto {
  @ApiProperty({ description: 'ID del cliente cuyo préstamo activo se renueva' })
  @IsUuidLike()
  cliente_id: string;

  @ApiProperty({ description: 'Nuevo capital aprobado (debe ser > saldo pendiente actual)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  capital_aprobado: number;

  @ApiProperty({ enum: ModalidadPrestamo })
  @IsEnum(ModalidadPrestamo)
  modalidad: ModalidadPrestamo;

  @ApiProperty({ description: 'Número de cuotas del nuevo préstamo' })
  @IsInt()
  @Min(1)
  @Max(360)
  numero_cuotas: number;

  @ApiProperty({ description: 'Nueva tasa de interés en porcentaje. Ej: 20 = 20%' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.1)
  @Max(500)
  tasa_interes: number;

  @ApiProperty({ description: 'ID del cobrador del nuevo préstamo' })
  @IsUuidLike()
  cobrador_id: string;

  @ApiProperty({ description: 'Fecha de primer pago del nuevo plan' })
  @IsDateString()
  fecha_primer_pago: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class MarcarVencidoDto {
  @ApiProperty({ description: 'ID del préstamo a marcar como vencido' })
  @IsUuidLike()
  prestamo_id: string;

  @ApiProperty({ description: 'Motivo del vencimiento / cierre forzoso' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ description: 'Reportar al buró de crédito automáticamente', default: true })
  @IsBoolean()
  reportar_buro: boolean;
}
