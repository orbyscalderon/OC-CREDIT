import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsNotEmpty, IsNumber,
  IsOptional, IsPositive, IsString, Length,
} from 'class-validator';
import { MotivoBuro, NivelRiesgoBuro } from '../entities/historial-credito.entity';
import { IsUuidLike } from '../../../common/decorators/is-uuid-like.decorator';

export class ConsultarBuroDto {
  @ApiProperty({ description: 'Cédula del cliente a consultar', example: '001-1234567-8' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  cedula: string;

  @ApiPropertyOptional({ description: 'Monto del préstamo que se planea otorgar (se registra en el log)' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monto_prestamo_planificado?: number;
}

export class ReportarDeudorDto {
  @ApiProperty({ description: 'Cédula del deudor', example: '001-1234567-8' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  cedula: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiPropertyOptional({ example: '809-555-1234' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'ID del préstamo en el sistema (opcional)' })
  @IsOptional()
  @IsUuidLike()
  prestamo_id?: string;

  @ApiProperty({ description: 'Monto de capital original prestado', example: 5000 })
  @IsNumber()
  @IsPositive()
  capital_original: number;

  @ApiProperty({ description: 'Saldo que quedó sin pagar', example: 3200 })
  @IsNumber()
  @IsPositive()
  saldo_impagado: number;

  @ApiPropertyOptional({ description: 'Días de mora al momento del reporte', example: 45 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  dias_mora?: number;

  @ApiProperty({ enum: ['MoraExtendida','ImpagoParcial','ImpagoTotal','Fraude','PrestamoAbandonado','ChequesDevueltos'] })
  @IsEnum(['MoraExtendida','ImpagoParcial','ImpagoTotal','Fraude','PrestamoAbandonado','ChequesDevueltos'])
  motivo: MotivoBuro;

  @ApiProperty({ enum: ['Bajo','Medio','Alto','CriticoNoPrestable'], default: 'Alto' })
  @IsEnum(['Bajo','Medio','Alto','CriticoNoPrestable'])
  nivel_riesgo: NivelRiesgoBuro;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion_detallada?: string;
}

export class MarcarDeudaSaldadaDto {
  @ApiProperty({ description: 'ID del reporte en buro_credito' })
  @IsUuidLike()
  reporte_id: string;

  @ApiProperty({ description: 'Fecha en que se saldó la deuda' })
  @IsDateString()
  fecha_saldo: string;

  @ApiPropertyOptional({ description: 'URL del comprobante de pago' })
  @IsOptional()
  @IsString()
  comprobante_url?: string;
}

export class InactivarReporteBuroDto {
  @ApiProperty({ description: 'ID del reporte a inactivar' })
  @IsUuidLike()
  reporte_id: string;

  @ApiProperty({ description: 'Motivo oficial de inactivación (solo super_admin)' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

// ── Respuestas ───────────────────────────────────────────────────────────────

export class PerfilBuroResponseDto {
  @ApiProperty()
  cedula: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellido: string;

  @ApiProperty()
  nivel_riesgo_consolidado: NivelRiesgoBuro;

  @ApiProperty()
  recomendacion: 'NO_PRESTAR' | 'PRESTAR_CON_MUCHA_CAUTELA' | 'PRESTAR_CON_CAUTELA' | 'PRECAUCION_HISTORIA_NEGATIVA';

  @ApiProperty()
  total_reportes: number;

  @ApiProperty()
  reportes_deuda_activa: number;

  @ApiProperty()
  deuda_pendiente_total: number;

  @ApiProperty()
  numero_agencias_reportantes: number;

  @ApiProperty()
  agencias_reportantes: string[];

  @ApiProperty()
  motivos_historicos: string[];

  @ApiProperty()
  ultimo_reporte: string;

  @ApiProperty()
  primer_reporte: string;

  @ApiProperty()
  max_dias_mora: number;

  @ApiProperty({ description: 'Detalle de cada reporte individual' })
  reportes: any[];
}
