import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoNovedad } from '../../../common/constants/roles.enum';
import { Empleado } from '../../usuarios/entities/empleado.entity';

@Entity('novedades_ruta')
export class NovedadRuta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  cobrador_id: string;

  @ManyToOne(() => Empleado)
  @JoinColumn({ name: 'cobrador_id' })
  cobrador: Empleado;

  @Column('uuid')
  cliente_id: string;

  @Column({ type: 'uuid', nullable: true })
  prestamo_id: string;

  @Column({ type: 'uuid', nullable: true })
  caja_id: string;

  @Column({ type: 'enum', enum: TipoNovedad })
  tipo: TipoNovedad;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'double precision' })
  latitud: number;

  @Column({ type: 'double precision' })
  longitud: number;

  @Column({ type: 'double precision', nullable: true })
  precision_gps: number;

  @Column({ length: 500, nullable: true })
  foto_url: string;

  @Column({ default: false })
  sincronizado_offline: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  timestamp_dispositivo: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
