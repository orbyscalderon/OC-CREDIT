import {
  Column, CreateDateColumn, Entity,
  Index, PrimaryGeneratedColumn,
} from 'typeorm';

export type NivelRiesgoBuro = 'Bajo' | 'Medio' | 'Alto' | 'CriticoNoPrestable';
export type MotivoBuro =
  | 'MoraExtendida'
  | 'ImpagoParcial'
  | 'ImpagoTotal'
  | 'Fraude'
  | 'PrestamoAbandonado'
  | 'ChequesDevueltos';

const moneyTransformer = {
  to: (v: number) => v,
  from: (v: string) => (v != null ? parseFloat(v) : null),
};

/**
 * Registro permanente de mal crédito. INMUTABLE por diseño.
 * NO usa FK con CASCADE. Sobrevive a la eliminación de tenants.
 * Solo un super_admin puede inactivar (activo=FALSE), nunca borrar.
 */
@Entity('buro_credito')
@Index(['cedula'])
@Index(['cedula', 'activo'])
export class HistorialCredito {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Identificación permanente del deudor ─────────────────────────────────
  @Column({ length: 20 })
  cedula: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 100 })
  apellido: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento: string;

  // ── Quién reportó (datos desnormalizados, sin FK) ─────────────────────────
  @Column('uuid')
  tenant_id: string;

  @Column({ length: 200 })
  tenant_nombre: string;

  @Column({ type: 'uuid', nullable: true })
  empleado_reporta_id: string;

  @Column({ length: 200, nullable: true })
  empleado_reporta_nombre: string;

  // ── Referencia débil al préstamo (sin FK, para permanencia) ──────────────
  @Column({ type: 'uuid', nullable: true })
  prestamo_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: moneyTransformer })
  capital_original: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: moneyTransformer })
  saldo_impagado: number;

  @Column({ length: 3, default: 'DOP' })
  moneda: string;

  @Column({ type: 'integer', nullable: true })
  dias_mora_al_reportar: number;

  // ── Clasificación ─────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 30 })
  motivo: MotivoBuro;

  @Column({ type: 'varchar', length: 30, default: 'Alto' })
  nivel_riesgo: NivelRiesgoBuro;

  @Column({ type: 'text', nullable: true })
  descripcion_detallada: string;

  // ── Permanencia ───────────────────────────────────────────────────────────
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_reporte: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ length: 150, nullable: true })
  inactivado_por_email: string;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_inactivacion: Date;

  @Column({ type: 'text', nullable: true })
  motivo_inactivacion: string;

  // ── Resolución posterior ──────────────────────────────────────────────────
  @Column({ default: false })
  deuda_saldada: boolean;

  @Column({ type: 'date', nullable: true })
  fecha_saldo_deuda: string;

  @Column({ length: 500, nullable: true })
  comprobante_saldo_url: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  get nombre_completo(): string {
    return `${this.nombre} ${this.apellido}`;
  }
}
