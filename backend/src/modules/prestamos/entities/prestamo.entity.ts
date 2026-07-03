import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import {
  EstadoPrestamo, ModalidadPrestamo,
} from '../../../common/constants/roles.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { CuotaAmortizacion } from './cuota-amortizacion.entity';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v !== null && v !== undefined ? parseFloat(v) : null),
};

@Entity('prestamos')
export class Prestamo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  cliente_id: string;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @Column({ type: 'uuid', nullable: true })
  supervisor_id: string;

  @Column({ type: 'uuid', nullable: true })
  aprobado_por_id: string;

  @Column({ type: 'uuid', nullable: true })
  cobrador_id: string;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'cobrador_id' })
  cobrador: Empleado;

  @Column({ type: 'uuid', nullable: true })
  ruta_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  capital_solicitado: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  capital_aprobado: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  capital_neto_entregado: number;

  @Column({ type: 'numeric', precision: 8, scale: 4, transformer: moneyTransformer })
  tasa_interes_pactada: number;

  @Column({ type: 'enum', enum: ModalidadPrestamo })
  modalidad: ModalidadPrestamo;

  @Column()
  numero_cuotas: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  monto_cuota: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  total_a_pagar: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  total_interes: number;

  @Column({ type: 'enum', enum: EstadoPrestamo, default: EstadoPrestamo.PENDIENTE })
  estado: EstadoPrestamo;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_solicitud: string;

  @Column({ type: 'date', nullable: true })
  fecha_aprobacion: string;

  @Column({ type: 'date', nullable: true })
  fecha_desembolso: string;

  @Column({ type: 'date', nullable: true })
  fecha_primer_pago: string;

  @Column({ type: 'date', nullable: true })
  fecha_ultimo_pago_esperado: string;

  @Column({ type: 'uuid', nullable: true })
  prestamo_anterior_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  saldo_liquidado_renovacion: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => CuotaAmortizacion, (c) => c.prestamo)
  cuotas: CuotaAmortizacion[];
}
