import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TipoTransaccion } from '../../../common/constants/roles.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { Caja } from './caja.entity';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v !== null && v !== undefined ? parseFloat(v) : 0),
};

export interface DistribucionPago {
  mora: number;
  interes: number;
  capital: number;
  excedente: number;
  cuotas_afectadas: string[];
  moras_pagadas: string[];
}

@Entity('transacciones')
export class Transaccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  uuid_idempotencia: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  caja_id: string;

  @ManyToOne(() => Caja)
  @JoinColumn({ name: 'caja_id' })
  caja: Caja;

  @Column('uuid')
  cobrador_id: string;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'cobrador_id' })
  cobrador: Empleado;

  @Column({ type: 'uuid', nullable: true })
  cliente_id: string;

  @Column({ type: 'uuid', nullable: true })
  prestamo_id: string;

  @Column({ type: 'enum', enum: TipoTransaccion })
  tipo: TipoTransaccion;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  monto: number;

  @Column({ type: 'jsonb', nullable: true })
  distribucion_pago: DistribucionPago;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 500, nullable: true })
  foto_comprobante_url: string;

  @Column({ type: 'double precision', nullable: true })
  latitud_transaccion: number;

  @Column({ type: 'double precision', nullable: true })
  longitud_transaccion: number;

  @Column({ type: 'double precision', nullable: true })
  precision_gps: number;

  @Column({ default: false })
  sincronizado_offline: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  timestamp_dispositivo: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
