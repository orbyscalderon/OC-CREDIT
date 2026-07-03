import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('super_admins')
export class SuperAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimo_acceso: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
