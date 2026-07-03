import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Ruta } from '../../rutas/entities/ruta.entity';

@Entity('clientes')
@Index(['tenant_id', 'cedula'], { unique: true, where: '"cedula" IS NOT NULL' })
@Index(['tenant_id', 'codigo_cliente'], { unique: true, where: '"codigo_cliente" IS NOT NULL' })
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', nullable: true })
  ruta_id: string;

  @ManyToOne(() => Ruta, { nullable: true })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta;

  @Column({ length: 50, nullable: true })
  codigo_cliente: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 20, nullable: true })
  cedula: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column({ length: 30, nullable: true })
  telefono_referencia: string;

  @Column({ length: 200, nullable: true })
  nombre_referencia: string;

  @Column({ type: 'text', nullable: true })
  direccion_casa: string;

  @Column({ type: 'double precision', nullable: true })
  latitud_casa: number;

  @Column({ type: 'double precision', nullable: true })
  longitud_casa: number;

  @Column({ length: 500, nullable: true })
  foto_url: string;

  @Column({ length: 500, nullable: true })
  foto_cedula_frontal_url: string;

  @Column({ length: 500, nullable: true })
  foto_cedula_trasera_url: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'integer', nullable: true })
  orden_visita: number;

  @Column({ type: 'smallint', default: 100 })
  score_pago: number;

  @Column({ type: 'text', nullable: true })
  notas_internas: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  get nombre_completo(): string {
    return `${this.nombre} ${this.apellido}`;
  }
}
