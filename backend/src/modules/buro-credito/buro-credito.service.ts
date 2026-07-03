import {
  ForbiddenException, Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { HistorialCredito, NivelRiesgoBuro, MotivoBuro } from './entities/historial-credito.entity';
import { ConsultaBuro } from './entities/consulta-buro.entity';
import {
  ConsultarBuroDto, ReportarDeudorDto,
  MarcarDeudaSaldadaDto, InactivarReporteBuroDto,
  PerfilBuroResponseDto,
} from './dto/buro.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

interface ReporteAutomaticoInput {
  cedula: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  tenantId: string;
  tenantNombre: string;
  empleadoId?: string;
  empleadoNombre?: string;
  prestamoId?: string;
  capitalOriginal: number;
  saldoImpagado: number;
  diasMora?: number;
  motivo: MotivoBuro;
  nivelRiesgo?: NivelRiesgoBuro;
  descripcion?: string;
  moneda?: string;
}

@Injectable()
export class BuroCreditoService {
  private readonly logger = new Logger(BuroCreditoService.name);

  constructor(
    @InjectRepository(HistorialCredito)
    private readonly buroRepo: Repository<HistorialCredito>,
    @InjectRepository(ConsultaBuro)
    private readonly consultaRepo: Repository<ConsultaBuro>,
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  // ─── CONSULTA CROSS-TENANT ─────────────────────────────────────────────────

  async consultarPorCedula(
    dto: ConsultarBuroDto,
    user: JwtPayload,
    tenantNombre: string,
  ): Promise<PerfilBuroResponseDto> {
    const cedulaNorm = dto.cedula.trim().replace(/\s/g, '');

    // Obtener perfil agregado desde la vista
    const perfil = await this.em.query<any[]>(
      `SELECT * FROM v_perfil_buro WHERE cedula = $1`,
      [cedulaNorm],
    );

    // Obtener reportes individuales (todos los tenants)
    const reportes = await this.buroRepo.find({
      where: { cedula: cedulaNorm, activo: true },
      order: { fecha_reporte: 'DESC' },
      select: [
        'id', 'fecha_reporte', 'motivo', 'nivel_riesgo',
        'saldo_impagado', 'capital_original', 'dias_mora_al_reportar',
        'tenant_nombre', 'descripcion_detallada', 'deuda_saldada',
        'fecha_saldo_deuda', 'moneda', 'created_at',
      ],
    });

    // Registrar la consulta en el log de auditoría
    await this.consultaRepo.save(
      this.consultaRepo.create({
        tenant_id: user.tenantId,
        tenant_nombre: tenantNombre,
        consultado_por_id: user.empleadoId,
        cedula_consultada: cedulaNorm,
        nombre_consultado: reportes[0]
          ? `${reportes[0].nombre ?? ''} ${reportes[0].apellido ?? ''}`.trim()
          : undefined,
        resultados_encontrados: reportes.length,
        nivel_maximo_encontrado: perfil[0]?.nivel_riesgo_consolidado ?? null,
        monto_prestamo: dto.monto_prestamo_planificado ?? null,
      }),
    );

    if (!perfil[0]) {
      return {
        cedula: cedulaNorm,
        nombre: '',
        apellido: '',
        nivel_riesgo_consolidado: null,
        recomendacion: null,
        total_reportes: 0,
        reportes_deuda_activa: 0,
        deuda_pendiente_total: 0,
        numero_agencias_reportantes: 0,
        agencias_reportantes: [],
        motivos_historicos: [],
        ultimo_reporte: null,
        primer_reporte: null,
        max_dias_mora: 0,
        reportes: [],
      } as any;
    }

    return {
      ...perfil[0],
      total_reportes: parseInt(perfil[0].total_reportes, 10),
      reportes_deuda_activa: parseInt(perfil[0].reportes_deuda_activa, 10),
      reportes_deuda_saldada: parseInt(perfil[0].reportes_deuda_saldada, 10),
      deuda_pendiente_total: parseFloat(perfil[0].deuda_pendiente_total ?? '0'),
      numero_agencias_reportantes: parseInt(perfil[0].numero_agencias_reportantes, 10),
      max_dias_mora: parseInt(perfil[0].max_dias_mora ?? '0', 10),
      reportes,
    };
  }

  // ─── REPORTAR DEUDOR (manual) ──────────────────────────────────────────────

  async reportarDeudor(
    dto: ReportarDeudorDto,
    user: JwtPayload,
    tenantNombre: string,
    empleadoNombre: string,
  ): Promise<HistorialCredito> {
    const registro = this.buroRepo.create({
      cedula: dto.cedula.trim(),
      nombre: dto.nombre.trim(),
      apellido: dto.apellido.trim(),
      telefono: dto.telefono ?? null,
      tenant_id: user.tenantId,
      tenant_nombre: tenantNombre,
      empleado_reporta_id: user.empleadoId,
      empleado_reporta_nombre: empleadoNombre,
      prestamo_id: dto.prestamo_id ?? null,
      capital_original: dto.capital_original,
      saldo_impagado: dto.saldo_impagado,
      dias_mora_al_reportar: dto.dias_mora ?? null,
      motivo: dto.motivo,
      nivel_riesgo: dto.nivel_riesgo,
      descripcion_detallada: dto.descripcion_detallada ?? null,
    });

    const saved = await this.buroRepo.save(registro);

    this.logger.warn(
      `BURÓ REPORTE: cédula=${dto.cedula} motivo=${dto.motivo} ` +
      `nivel=${dto.nivel_riesgo} tenant=${tenantNombre} deuda=${dto.saldo_impagado}`,
    );

    return saved;
  }

  /**
   * Reporte automático llamado internamente al cerrar un préstamo en default.
   * No requiere interacción del usuario.
   */
  async reportarAutomatico(input: ReporteAutomaticoInput): Promise<void> {
    try {
      await this.buroRepo.save(
        this.buroRepo.create({
          cedula: input.cedula.trim(),
          nombre: input.nombre.trim(),
          apellido: input.apellido.trim(),
          telefono: input.telefono ?? null,
          tenant_id: input.tenantId,
          tenant_nombre: input.tenantNombre,
          empleado_reporta_id: input.empleadoId ?? null,
          empleado_reporta_nombre: input.empleadoNombre ?? null,
          prestamo_id: input.prestamoId ?? null,
          capital_original: input.capitalOriginal,
          saldo_impagado: input.saldoImpagado,
          moneda: input.moneda ?? 'DOP',
          dias_mora_al_reportar: input.diasMora ?? null,
          motivo: input.motivo,
          nivel_riesgo: input.nivelRiesgo ?? 'Alto',
          descripcion_detallada: input.descripcion ?? 'Reporte automático del sistema',
        }),
      );

      this.logger.warn(
        `BURÓ AUTO: cédula=${input.cedula} prestamo=${input.prestamoId} ` +
        `deuda=${input.saldoImpagado} ${input.moneda}`,
      );
    } catch (err) {
      // No propagamos el error para no interrumpir el flujo principal
      this.logger.error(`Error en reporte automático buró: ${(err as Error).message}`);
    }
  }

  /** true solo el último día calendario del mes, en la zona horaria de Postgres (RD). */
  async esUltimoDiaDelMes(): Promise<boolean> {
    const r = await this.em.query<{ es_ultimo: boolean }[]>(`
      SELECT CURRENT_DATE = (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date AS es_ultimo
    `);
    return r[0].es_ultimo;
  }

  // ─── REPORTE MENSUAL DE ATRASADOS (control, no cierra el préstamo) ─────────
  /**
   * Se ejecuta el último día de cada mes (ver BuroScheduler). A diferencia
   * de reportarAutomatico() al marcar un préstamo Vencido (que lo CIERRA),
   * esto es un snapshot de control: el préstamo sigue Activo, solo queda
   * constancia permanente de que el cliente estaba atrasado ese mes.
   * No duplica si ya se reportó este mismo préstamo en el mes en curso.
   */
  async reportarAtrasadosFinMes(
    soloTenantId?: string,
  ): Promise<{ tenants_procesados: number; reportes_creados: number }> {
    const tenants = soloTenantId
      ? await this.em.query<{ id: string; nombre_empresa: string }[]>(
          `SELECT id, nombre_empresa FROM tenants WHERE activo = TRUE AND id = $1`,
          [soloTenantId],
        )
      : await this.em.query<{ id: string; nombre_empresa: string }[]>(
          `SELECT id, nombre_empresa FROM tenants WHERE activo = TRUE`,
        );

    let reportesCreados = 0;

    for (const tenant of tenants) {
      const atrasados = await this.em.query<any[]>(`
        SELECT
          cl.cedula, cl.nombre, cl.apellido, cl.telefono,
          p.id AS prestamo_id, p.capital_aprobado,
          MAX(cm.dias_mora) AS dias_mora,
          SUM(cm.monto_mora - cm.monto_pagado) AS mora_pendiente,
          COALESCE((
            SELECT SUM(ca.monto_total - ca.monto_pagado)
            FROM cuotas_amortizacion ca
            WHERE ca.prestamo_id = p.id AND ca.estado IN ('Pendiente','Abonado','Vencida')
          ), 0) AS saldo_pendiente
        FROM prestamos p
        JOIN clientes cl ON cl.id = p.cliente_id
        JOIN cargos_mora cm ON cm.prestamo_id = p.id AND cm.estado = 'Pendiente'
        WHERE p.tenant_id = $1 AND p.estado = 'Activo'
          AND cl.cedula IS NOT NULL AND cl.cedula != ''
        GROUP BY cl.cedula, cl.nombre, cl.apellido, cl.telefono, p.id, p.capital_aprobado
      `, [tenant.id]);

      for (const row of atrasados) {
        const yaReportadoEsteMes = await this.em.query<any[]>(`
          SELECT 1 FROM buro_credito
          WHERE prestamo_id = $1 AND motivo = 'MoraExtendida'
            AND date_trunc('month', fecha_reporte) = date_trunc('month', CURRENT_DATE)
          LIMIT 1
        `, [row.prestamo_id]);
        if (yaReportadoEsteMes.length > 0) continue;

        const diasMora = parseInt(row.dias_mora, 10);
        const nivel: NivelRiesgoBuro =
          diasMora >= 60 ? 'Alto' : diasMora >= 15 ? 'Medio' : 'Bajo';

        await this.reportarAutomatico({
          cedula: row.cedula,
          nombre: row.nombre,
          apellido: row.apellido,
          telefono: row.telefono,
          tenantId: tenant.id,
          tenantNombre: tenant.nombre_empresa,
          prestamoId: row.prestamo_id,
          capitalOriginal: parseFloat(row.capital_aprobado),
          saldoImpagado: parseFloat(row.saldo_pendiente),
          diasMora,
          motivo: 'MoraExtendida',
          nivelRiesgo: nivel,
          descripcion: `Reporte mensual de control — atrasado al cierre de mes (${diasMora} días de mora, mora pendiente RD$${row.mora_pendiente})`,
        });
        reportesCreados++;
      }
    }

    this.logger.warn(
      `BURÓ FIN DE MES: ${tenants.length} tenants procesados, ${reportesCreados} reportes creados`,
    );

    return { tenants_procesados: tenants.length, reportes_creados: reportesCreados };
  }

  // ─── MARCAR DEUDA COMO SALDADA ─────────────────────────────────────────────

  async marcarDeudaSaldada(
    dto: MarcarDeudaSaldadaDto,
    user: JwtPayload,
  ): Promise<HistorialCredito> {
    const reporte = await this.buroRepo.findOne({
      where: { id: dto.reporte_id },
    });

    if (!reporte) throw new NotFoundException('Reporte no encontrado en el buró');

    // Solo el tenant que reportó puede marcar como saldada (o super_admin)
    if (reporte.tenant_id !== user.tenantId && user.rol !== Rol.ADMIN_TENANT) {
      throw new ForbiddenException('Solo el tenant que reportó puede marcar la deuda como saldada');
    }

    reporte.deuda_saldada = true;
    reporte.fecha_saldo_deuda = dto.fecha_saldo;
    reporte.comprobante_saldo_url = dto.comprobante_url ?? null;

    // Bajar el nivel de riesgo si la deuda fue saldada (pero el reporte PERMANECE)
    if (reporte.nivel_riesgo === 'Alto') {
      reporte.nivel_riesgo = 'Medio';
    } else if (reporte.nivel_riesgo === 'Medio') {
      reporte.nivel_riesgo = 'Bajo';
    }

    this.logger.log(
      `BURÓ SALDO: reporte=${dto.reporte_id} cédula=${reporte.cedula} ` +
      `fecha=${dto.fecha_saldo}`,
    );

    return this.buroRepo.save(reporte);
  }

  // ─── INACTIVAR REPORTE (solo super_admin) ─────────────────────────────────

  async inactivarReporte(
    dto: InactivarReporteBuroDto,
    superAdminEmail: string,
  ): Promise<void> {
    const reporte = await this.buroRepo.findOne({ where: { id: dto.reporte_id } });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');

    // No borramos, solo marcamos como inactivo con trazabilidad
    reporte.activo = false;
    reporte.inactivado_por_email = superAdminEmail;
    reporte.fecha_inactivacion = new Date();
    reporte.motivo_inactivacion = dto.motivo;

    await this.buroRepo.save(reporte);

    this.logger.warn(
      `BURÓ INACTIVADO: id=${dto.reporte_id} por=${superAdminEmail} motivo="${dto.motivo}"`,
    );
  }

  // ─── REPORTES PROPIOS DEL TENANT ──────────────────────────────────────────

  async obtenerReportesPropios(tenantId: string, page = 1, limit = 50) {
    const [reportes, total] = await this.buroRepo.findAndCount({
      where: { tenant_id: tenantId },
      order: { fecha_reporte: 'DESC', created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: reportes,
      total,
      pagina: page,
      total_paginas: Math.ceil(total / limit),
    };
  }

  // ─── ESTADÍSTICAS GENERALES (super_admin) ─────────────────────────────────

  async estadisticasGlobales() {
    const stats = await this.em.query<any[]>(`
      SELECT
        COUNT(*)                                                AS total_registros,
        COUNT(*) FILTER (WHERE activo = TRUE)                  AS registros_activos,
        COUNT(DISTINCT cedula)                                  AS cedulas_unicas,
        COUNT(DISTINCT tenant_id)                              AS tenants_con_reportes,
        SUM(saldo_impagado) FILTER (WHERE NOT deuda_saldada)   AS deuda_total_sistema,
        COUNT(*) FILTER (WHERE nivel_riesgo = 'CriticoNoPrestable') AS criticos,
        COUNT(*) FILTER (WHERE nivel_riesgo = 'Alto')          AS altos,
        COUNT(*) FILTER (WHERE nivel_riesgo = 'Medio')         AS medios,
        COUNT(*) FILTER (WHERE nivel_riesgo = 'Bajo')          AS bajos
      FROM buro_credito
    `);

    return stats[0];
  }
}
