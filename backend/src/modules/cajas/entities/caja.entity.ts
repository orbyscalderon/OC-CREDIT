import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { EstadoCaja } from '../../../common/constants/roles.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';
import { Ruta } from '../../rutas/entities/ruta.entity';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v !== null && v !== undefined ? parseFloat(v) : 0),
};

@Entity('cajas')
// Un cobrador puede tener varias cajas abiertas a la vez, una por ruta
// (ver migración 006: uq_caja_cobrador_ruta_fecha). synchronize:false, así
// que este decorador es solo documentación — no se aplica en runtime.
@Index(['tenant_id', 'cobrador_id', 'ruta_id', 'fecha'], { unique: true })
export class Caja {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  cobrador_id: string;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'cobrador_id' })
  cobrador: Empleado;

  @Column({ type: 'uuid', nullable: true })
  ruta_id: string;

  @ManyToOne(() => Ruta)
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  monto_apertura: number;

  @Column({ type: 'double precision', nullable: true })
  latitud_apertura: number;

  @Column({ type: 'double precision', nullable: true })
  longitud_apertura: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  hora_apertura: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  total_cobros: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: moneyTransformer })
  total_gastos: number;

  // monto_esperado es columna generada en BD, solo lectura aquí
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true,
    generatedType: 'STORED',
    asExpression: 'monto_apertura + total_cobros - total_gastos',
    transformer: moneyTransformer,
  })
  monto_esperado: number;

  // Cierre ciego: solo Admin puede ver diferencia_cierre
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  monto_cierre_declarado: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  diferencia_cierre: number;

  @Column({ type: 'double precision', nullable: true })
  latitud_cierre: number;

  @Column({ type: 'double precision', nullable: true })
  longitud_cierre: number;

  @Column({ type: 'timestamptz', nullable: true })
  hora_cierre: Date;

  @Column({ type: 'text', nullable: true })
  nota_cierre: string;

  @Column({ type: 'enum', enum: EstadoCaja, default: EstadoCaja.ABIERTA })
  estado: EstadoCaja;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
