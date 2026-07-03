import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { EstadoCuota } from '../../../common/constants/roles.enum';
import { Prestamo } from './prestamo.entity';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v !== null && v !== undefined ? parseFloat(v) : 0),
};

@Entity('cuotas_amortizacion')
@Index(['prestamo_id', 'numero_cuota'], { unique: true })
export class CuotaAmortizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  prestamo_id: string;

  @ManyToOne(() => Prestamo, (p) => p.cuotas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prestamo_id' })
  prestamo: Prestamo;

  @Column()
  numero_cuota: number;

  @Column({ type: 'date' })
  fecha_vencimiento: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  capital: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  interes: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  monto_total: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  capital_pagado: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  interes_pagado: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  monto_pagado: number;

  @Column({ type: 'enum', enum: EstadoCuota, default: EstadoCuota.PENDIENTE })
  estado: EstadoCuota;

  @Column({ type: 'date', nullable: true })
  fecha_pago: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  get capital_pendiente(): number {
    return Math.max(0, this.capital - this.capital_pagado);
  }

  get interes_pendiente(): number {
    return Math.max(0, this.interes - this.interes_pagado);
  }

  get saldo_pendiente(): number {
    return Math.max(0, this.monto_total - this.monto_pagado);
  }
}
