import {
  Column, CreateDateColumn, Entity, JoinColumn,
  OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_settings')
export class TenantSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @OneToOne(() => Tenant, (t) => t.settings)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 500, nullable: true })
  url_logo: string;

  @Column({ length: 7, default: '#1976D2' })
  color_primario: string;

  @Column({ length: 7, default: '#424242' })
  color_secundario: string;

  @Column({ length: 7, default: '#FF6F00' })
  color_acento: string;

  @Column({ length: 3, default: 'DOP' })
  moneda: string;

  @Column({ length: 5, default: 'RD$' })
  simbolo_moneda: string;

  @Column({ type: 'text', nullable: true })
  texto_pie_recibo: string;

  @Column({ default: 1 })
  dias_mora_gracia: number;

  @Column({ type: 'numeric', precision: 7, scale: 6, default: 0.02,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) } })
  tasa_mora_diaria: number;

  @Column({ default: false })
  permite_cobro_domingo: boolean;

  @Column({ length: 50, default: 'America/Santo_Domingo' })
  zona_horaria: string;

  @Column({ length: 20, default: 'DD/MM/YYYY' })
  formato_fecha: string;

  @Column({ length: 200, nullable: true })
  nombre_comercial: string;

  @Column({ type: 'text', nullable: true })
  direccion_fiscal: string;

  @Column({ length: 30, nullable: true })
  telefono_soporte: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
