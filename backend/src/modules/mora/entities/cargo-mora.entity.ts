import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { EstadoCargoMora } from '../../../common/constants/roles.enum';
import { Prestamo } from '../../prestamos/entities/prestamo.entity';
import { CuotaAmortizacion } from '../../prestamos/entities/cuota-amortizacion.entity';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v !== null && v !== undefined ? parseFloat(v) : 0),
};

@Entity('cargos_mora')
export class CargoMora {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  prestamo_id: string;

  @ManyToOne(() => Prestamo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prestamo_id' })
  prestamo: Prestamo;

  @Column('uuid')
  cuota_id: string;

  @ManyToOne(() => CuotaAmortizacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cuota_id' })
  cuota: CuotaAmortizacion;

  @Column({ length: 20, default: 'PorcentajeDiario' })
  tipo: string;

  @Column({ type: 'integer' })
  dias_mora: number;

  @Column({ type: 'numeric', precision: 7, scale: 6, nullable: true, transformer: moneyTransformer })
  tasa_aplicada: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  monto_mora: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  monto_pagado: number;

  @Column({ type: 'enum', enum: EstadoCargoMora, default: EstadoCargoMora.PENDIENTE })
  estado: EstadoCargoMora;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_generacion: string;

  @Column({ type: 'date', nullable: true })
  fecha_pago: string;

  @Column({ type: 'uuid', nullable: true })
  transaccion_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  get saldo_mora(): number {
    return Math.max(0, this.monto_mora - this.monto_pagado);
  }
}
