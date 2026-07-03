import {
  Column, CreateDateColumn, Entity, Index,
  JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Rol } from '../../../common/constants/roles.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Empleado } from './empleado.entity';

@Entity('usuarios')
@Index(['tenant_id', 'email'], { unique: true })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 150 })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimo_acceso: Date;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  token_refresh: string;

  @Column({ type: 'smallint', default: 0 })
  intentos_fallidos: number;

  @Column({ type: 'timestamptz', nullable: true })
  bloqueado_hasta: Date;

  @Column({ default: false })
  must_change_pwd: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToOne(() => Empleado, (e) => e.usuario)
  empleado: Empleado;
}
