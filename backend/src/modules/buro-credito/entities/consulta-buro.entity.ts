import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NivelRiesgoBuro } from './historial-credito.entity';

/** Auditoría inmutable de todas las consultas al buró. */
@Entity('consultas_buro')
export class ConsultaBuro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column({ length: 200 })
  tenant_nombre: string;

  @Column({ type: 'uuid', nullable: true })
  consultado_por_id: string;

  @Column({ length: 200, nullable: true })
  consultado_por_nombre: string;

  @Column({ length: 20 })
  cedula_consultada: string;

  @Column({ length: 200, nullable: true })
  nombre_consultado: string;

  @Column({ default: 0 })
  resultados_encontrados: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  nivel_maximo_encontrado: NivelRiesgoBuro;

  @Column({ length: 50, nullable: true })
  decision_tomada: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true,
    transformer: { to: (v: number) => v, from: (v: string) => v != null ? parseFloat(v) : null } })
  monto_prestamo: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
