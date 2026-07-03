import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Empleado } from '../../usuarios/entities/empleado.entity';

@Entity('rutas')
export class Ruta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 100, nullable: true })
  zona: string;

  @Column({ type: 'uuid', nullable: true })
  cobrador_id: string;

  @ManyToOne(() => Empleado, { nullable: true })
  @JoinColumn({ name: 'cobrador_id' })
  cobrador: Empleado;

  @Column({ default: true })
  activa: boolean;

  @Column({ length: 7, default: '#2196F3' })
  color_mapa: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
