import {
  Column, CreateDateColumn, Entity,
  OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TenantSettings } from './tenant-settings.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nombre_empresa: string;

  @Column({ length: 50, unique: true })
  ruc_cedula: string;

  @Column({ length: 150, unique: true })
  email_contacto: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column({ length: 2, default: 'DO' })
  pais: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ length: 50, default: 'basico' })
  plan_suscripcion: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_inicio_suscripcion: string;

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento_suscripcion: string;

  @Column({ default: 5 })
  max_cobradores: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToOne(() => TenantSettings, (s) => s.tenant)
  settings: TenantSettings;
}
