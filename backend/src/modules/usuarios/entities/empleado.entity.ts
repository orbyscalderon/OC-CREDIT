import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Usuario } from './usuario.entity';

@Entity('empleados')
@Index(['tenant_id', 'cedula'], { unique: true, where: '"cedula" IS NOT NULL' })
export class Empleado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid')
  usuario_id: string;

  @OneToOne(() => Usuario, (u) => u.empleado)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 20, nullable: true })
  cedula: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ length: 500, nullable: true })
  foto_url: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  get nombre_completo(): string {
    return `${this.nombre} ${this.apellido}`;
  }
}
