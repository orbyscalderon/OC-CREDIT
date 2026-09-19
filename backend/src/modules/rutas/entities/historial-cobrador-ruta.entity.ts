import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Log de auditoría insert-only: quién reasignó una ruta a qué cobrador y
 * cuándo. Nunca se actualiza ni se borra un registro existente (mismo
 * patrón que ConsultaBuro/HistorialCredito) — el nombre del actor y de los
 * cobradores queda desnormalizado para no depender de un JOIN al listar.
 */
@Entity('ruta_historial_cobrador')
export class HistorialCobradorRuta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  ruta_id: string;

  @Column({ length: 100 })
  ruta_nombre: string;

  @Column({ type: 'uuid', nullable: true })
  cobrador_anterior_id: string | null;

  @Column({ length: 200, nullable: true })
  cobrador_anterior_nombre: string | null;

  @Column('uuid')
  cobrador_nuevo_id: string;

  @Column({ length: 200 })
  cobrador_nuevo_nombre: string;

  @Column('uuid')
  cambiado_por_id: string;

  @Column({ length: 200, nullable: true })
  cambiado_por_nombre: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
