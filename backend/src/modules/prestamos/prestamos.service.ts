import {
  BadRequestException, Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Prestamo } from './entities/prestamo.entity';
import { CuotaAmortizacion } from './entities/cuota-amortizacion.entity';
import { CargoMora } from '../mora/entities/cargo-mora.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Empleado } from '../usuarios/entities/empleado.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Ruta } from '../rutas/entities/ruta.entity';
import { BuroCreditoService } from '../buro-credito/buro-credito.service';
import { PlanesService } from '../planes/planes.service';
import {
  AprobarPrestamoDto, CrearPrestamoDto,
  MarcarVencidoDto, RechazarPrestamoDto, RenovarPrestamoDto,
} from './dto/prestamo.dto';
import {
  EstadoCuota, EstadoPrestamo,
  EstadoCargoMora,
} from '../../common/constants/roles.enum';
import {
  calcularPlanAmortizacion,
} from './helpers/amortizacion.helper';
import {
  generarFechasVencimiento,
} from './helpers/dias-habiles.helper';
import { fechaHoyRD } from '../../common/utils/fecha-negocio.util';

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => Math.round(c) / 100;

@Injectable()
export class PrestamosService {
  private readonly logger = new Logger(PrestamosService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @InjectRepository(Prestamo) private readonly prestamoRepo: Repository<Prestamo>,
    @InjectRepository(CuotaAmortizacion) private readonly cuotaRepo: Repository<CuotaAmortizacion>,
    @InjectRepository(Ruta) private readonly rutaRepo: Repository<Ruta>,
    private readonly buroCreditoService: BuroCreditoService,
    private readonly planesService: PlanesService,
  ) {}

  // ─── CREAR SOLICITUD ───────────────────────────────────────────────────────

  async crearSolicitud(
    tenantId: string,
    supervisorEmpleadoId: string,
    dto: CrearPrestamoDto,
    cobradorIdSiAplica?: string,
  ): Promise<Prestamo> {
    // Verificar límite del plan SaaS antes de crear
    await this.planesService.verificarLimitePrestamo(tenantId);

    // Un cobrador solo puede solicitar para una ruta que tenga asignada —
    // evita que registre clientes/préstamos fuera de su zona de cobranza.
    if (cobradorIdSiAplica) {
      const ruta = await this.rutaRepo.findOne({
        where: { id: dto.ruta_id, tenant_id: tenantId, cobrador_id: cobradorIdSiAplica },
      });
      if (!ruta) {
        throw new BadRequestException('Esa ruta no está asignada a este cobrador.');
      }
    }

    // Verificar que el cliente no tiene préstamo activo en este tenant
    const prestamoActivo = await this.prestamoRepo.findOne({
      where: { tenant_id: tenantId, cliente_id: dto.cliente_id, estado: EstadoPrestamo.ACTIVO },
    });
    if (prestamoActivo) {
      throw new BadRequestException(
        'El cliente ya tiene un préstamo activo. Use la opción de Renovación para re-enganchar.',
      );
    }

    const prestamo = this.prestamoRepo.create({
      tenant_id: tenantId,
      cliente_id: dto.cliente_id,
      ruta_id: dto.ruta_id,
      supervisor_id: supervisorEmpleadoId,
      capital_solicitado: dto.capital_solicitado,
      modalidad: dto.modalidad,
      numero_cuotas: dto.numero_cuotas,
      tasa_interes_pactada: dto.tasa_interes_propuesta ?? 0,  // Propuesta del supervisor; el admin la confirma o cambia al aprobar
      estado: EstadoPrestamo.PENDIENTE,
      notas: dto.notas ?? null,
    });

    return this.prestamoRepo.save(prestamo);
  }

  // ─── APROBAR + GENERAR PLAN DE AMORTIZACIÓN ────────────────────────────────

  async aprobar(
    tenantId: string,
    adminEmpleadoId: string,
    prestamoId: string,
    dto: AprobarPrestamoDto,
  ): Promise<{ prestamo: Prestamo; plan: CuotaAmortizacion[] }> {
    return this.em.transaction(async (tx) => {
      const prestamo = await tx.findOne(Prestamo, {
        where: { id: prestamoId, tenant_id: tenantId, estado: EstadoPrestamo.PENDIENTE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!prestamo) throw new NotFoundException('Solicitud no encontrada o ya procesada');

      const hoy = fechaHoyRD();
      const fechaInicio = new Date(dto.fecha_primer_pago);

      // Generar fechas de vencimiento respetando días hábiles
      const fechas = await generarFechasVencimiento(
        fechaInicio,
        prestamo.modalidad as any,
        prestamo.numero_cuotas,
        tenantId,
        tx,
      );

      // Calcular plan de amortización
      const plan = calcularPlanAmortizacion(
        dto.capital_aprobado,
        dto.tasa_interes,
        prestamo.numero_cuotas,
        fechas,
      );

      const totalAPagar = plan.reduce((s, c) => s + c.monto_total, 0);
      const totalInteres = plan.reduce((s, c) => s + c.interes, 0);

      // Actualizar préstamo
      await tx.update(Prestamo, { id: prestamoId }, {
        capital_aprobado: dto.capital_aprobado,
        capital_neto_entregado: dto.capital_aprobado,
        tasa_interes_pactada: dto.tasa_interes,
        cobrador_id: dto.cobrador_id,
        aprobado_por_id: adminEmpleadoId,
        monto_cuota: plan[0].monto_total,
        total_a_pagar: Math.round(totalAPagar * 100) / 100,
        total_interes: Math.round(totalInteres * 100) / 100,
        estado: EstadoPrestamo.ACTIVO,
        fecha_aprobacion: hoy,
        fecha_desembolso: hoy,
        fecha_primer_pago: dto.fecha_primer_pago,
        fecha_ultimo_pago_esperado: fechas[fechas.length - 1].toISOString().split('T')[0],
        notas: dto.notas ?? prestamo.notas,
      });

      // Insertar cuotas de amortización
      const cuotas = plan.map((c) =>
        tx.create(CuotaAmortizacion, {
          tenant_id: tenantId,
          prestamo_id: prestamoId,
          numero_cuota: c.numero_cuota,
          fecha_vencimiento: c.fecha_vencimiento.toISOString().split('T')[0],
          capital: c.capital,
          interes: c.interes,
          monto_total: c.monto_total,
        }),
      );

      const cuotasGuardadas = await tx.save(CuotaAmortizacion, cuotas);
      const prestamoActualizado = await tx.findOne(Prestamo, { where: { id: prestamoId } });

      this.logger.log(
        `Préstamo aprobado: ${prestamoId} capital=${dto.capital_aprobado} ` +
        `cuotas=${prestamo.numero_cuotas} total=${totalAPagar}`,
      );

      return { prestamo: prestamoActualizado, plan: cuotasGuardadas };
    });
  }

  // ─── RENOVACIÓN (RE-ENGANCHE) ──────────────────────────────────────────────
  // Regla: NO pueden existir dos préstamos Activos simultáneos del mismo cliente.
  // El viejo se liquida con el capital del nuevo y se entrega el diferencial al cliente.

  async renovar(
    tenantId: string,
    adminEmpleadoId: string,
    dto: RenovarPrestamoDto,
  ): Promise<{
    prestamo_nuevo: Prestamo;
    capital_neto_entregado: number;
    saldo_liquidado: number;
    plan: CuotaAmortizacion[];
  }> {
    return this.em.transaction(async (tx) => {
      // 1. Encontrar el préstamo activo del cliente
      const prestamoViejo = await tx
        .createQueryBuilder(Prestamo, 'p')
        .where('p.cliente_id = :cid', { cid: dto.cliente_id })
        .andWhere('p.tenant_id = :tid', { tid: tenantId })
        .andWhere('p.estado = :estado', { estado: EstadoPrestamo.ACTIVO })
        .setLock('pessimistic_write')
        .getOne();

      if (!prestamoViejo) {
        throw new NotFoundException(
          'No se encontró préstamo activo para renovar. Use la opción de nuevo préstamo.',
        );
      }

      // 2. Calcular saldo total pendiente (cuotas + mora)
      const [saldoCuotas, saldoMora] = await Promise.all([
        tx
          .createQueryBuilder(CuotaAmortizacion, 'ca')
          .select('COALESCE(SUM(ca.monto_total - ca.monto_pagado), 0)', 'saldo')
          .where('ca.prestamo_id = :pid', { pid: prestamoViejo.id })
          .andWhere('ca.estado IN (:...estados)', {
            estados: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
          })
          .getRawOne<{ saldo: string }>(),

        tx
          .createQueryBuilder(CargoMora, 'cm')
          .select('COALESCE(SUM(cm.monto_mora - cm.monto_pagado), 0)', 'saldo')
          .where('cm.prestamo_id = :pid', { pid: prestamoViejo.id })
          .andWhere('cm.estado = :estado', { estado: EstadoCargoMora.PENDIENTE })
          .getRawOne<{ saldo: string }>(),
      ]);

      const saldoTotalDeuda =
        parseFloat(saldoCuotas.saldo) + parseFloat(saldoMora.saldo);

      if (dto.capital_aprobado <= saldoTotalDeuda) {
        throw new BadRequestException(
          `El capital aprobado (${dto.capital_aprobado}) debe ser mayor al saldo pendiente ` +
          `(${saldoTotalDeuda.toFixed(2)}) para poder renovar.`,
        );
      }

      const capitalNetoEntregado =
        fromCents(toCents(dto.capital_aprobado) - toCents(saldoTotalDeuda));

      // 3. Liquidar préstamo viejo: marcar cuotas y moras como pagadas.
      // monto_pagado/capital_pagado/interes_pagado deben igualar el total —
      // si solo se actualiza el estado, la cuota queda "Pagada" pero con
      // saldo_pendiente > 0 para cualquier reporte que lo calcule.
      await tx
        .createQueryBuilder()
        .update(CuotaAmortizacion)
        .set({
          estado: EstadoCuota.PAGADO,
          fecha_pago: fechaHoyRD(),
          monto_pagado: () => 'monto_total',
          capital_pagado: () => 'capital',
          interes_pagado: () => 'interes',
        })
        .where('prestamo_id = :pid', { pid: prestamoViejo.id })
        .andWhere('estado IN (:...estados)', {
          estados: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
        })
        .execute();

      await tx
        .createQueryBuilder()
        .update(CargoMora)
        .set({
          estado: EstadoCargoMora.PAGADO,
          fecha_pago: fechaHoyRD(),
          monto_pagado: () => 'monto_mora',
        })
        .where('prestamo_id = :pid', { pid: prestamoViejo.id })
        .andWhere('estado = :estado', { estado: EstadoCargoMora.PENDIENTE })
        .execute();

      await tx.update(Prestamo, { id: prestamoViejo.id }, {
        estado: EstadoPrestamo.PAGADO_RENOVACION,
        saldo_liquidado_renovacion: saldoTotalDeuda,
      });

      // 4. Generar el nuevo préstamo
      const hoy = fechaHoyRD();
      const fechaInicio = new Date(dto.fecha_primer_pago);
      const fechas = await generarFechasVencimiento(
        fechaInicio, dto.modalidad as any, dto.numero_cuotas, tenantId, tx,
      );
      const plan = calcularPlanAmortizacion(
        dto.capital_aprobado, dto.tasa_interes, dto.numero_cuotas, fechas,
      );

      const totalAPagar = plan.reduce((s, c) => s + c.monto_total, 0);
      const totalInteres = plan.reduce((s, c) => s + c.interes, 0);

      const prestamoNuevo = tx.create(Prestamo, {
        tenant_id: tenantId,
        cliente_id: dto.cliente_id,
        cobrador_id: dto.cobrador_id,
        ruta_id: prestamoViejo.ruta_id,
        aprobado_por_id: adminEmpleadoId,
        capital_solicitado: dto.capital_aprobado,
        capital_aprobado: dto.capital_aprobado,
        capital_neto_entregado: capitalNetoEntregado,
        tasa_interes_pactada: dto.tasa_interes,
        modalidad: dto.modalidad,
        numero_cuotas: dto.numero_cuotas,
        monto_cuota: plan[0].monto_total,
        total_a_pagar: Math.round(totalAPagar * 100) / 100,
        total_interes: Math.round(totalInteres * 100) / 100,
        estado: EstadoPrestamo.ACTIVO,
        fecha_solicitud: hoy,
        fecha_aprobacion: hoy,
        fecha_desembolso: hoy,
        fecha_primer_pago: dto.fecha_primer_pago,
        fecha_ultimo_pago_esperado: fechas[fechas.length - 1].toISOString().split('T')[0],
        prestamo_anterior_id: prestamoViejo.id,
        saldo_liquidado_renovacion: saldoTotalDeuda,
        notas: dto.notas ?? null,
      });

      const savedNuevo = await tx.save(Prestamo, prestamoNuevo);

      const cuotas = plan.map((c) =>
        tx.create(CuotaAmortizacion, {
          tenant_id: tenantId,
          prestamo_id: savedNuevo.id,
          numero_cuota: c.numero_cuota,
          fecha_vencimiento: c.fecha_vencimiento.toISOString().split('T')[0],
          capital: c.capital,
          interes: c.interes,
          monto_total: c.monto_total,
        }),
      );
      const cuotasGuardadas = await tx.save(CuotaAmortizacion, cuotas);

      this.logger.log(
        `Renovación: viejo=${prestamoViejo.id} → nuevo=${savedNuevo.id} ` +
        `deuda_liquidada=${saldoTotalDeuda} neto_entregado=${capitalNetoEntregado}`,
      );

      return {
        prestamo_nuevo: savedNuevo,
        capital_neto_entregado: capitalNetoEntregado,
        saldo_liquidado: saldoTotalDeuda,
        plan: cuotasGuardadas,
      };
    });
  }

  // ─── MARCAR COMO VENCIDO + REPORTE AUTOMÁTICO AL BURÓ ─────────────────────

  async marcarVencido(
    tenantId: string,
    dto: MarcarVencidoDto,
  ): Promise<void> {
    return this.em.transaction(async (tx) => {
      const prestamo = await tx.findOne(Prestamo, {
        where: { id: dto.prestamo_id, tenant_id: tenantId, estado: EstadoPrestamo.ACTIVO },
        lock: { mode: 'pessimistic_write' },
      });
      if (!prestamo) throw new NotFoundException('Préstamo activo no encontrado');

      const cliente = await tx.findOne(Cliente, {
        where: { id: prestamo.cliente_id },
      });

      const tenant = await tx.findOne(Tenant, { where: { id: tenantId } });

      // Calcular saldo final pendiente
      const saldoResult = await tx
        .createQueryBuilder(CuotaAmortizacion, 'ca')
        .select('COALESCE(SUM(ca.monto_total - ca.monto_pagado), 0)', 'cuotas')
        .where('ca.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('ca.estado IN (:...e)', {
          e: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
        })
        .getRawOne<{ cuotas: string }>();

      const moraResult = await tx
        .createQueryBuilder(CargoMora, 'cm')
        .select('COALESCE(SUM(cm.monto_mora - cm.monto_pagado), 0)', 'mora')
        .where('cm.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('cm.estado = :estado', { estado: EstadoCargoMora.PENDIENTE })
        .getRawOne<{ mora: string }>();

      const saldoFinal =
        parseFloat(saldoResult.cuotas) + parseFloat(moraResult.mora);

      const diasMora = await tx
        .createQueryBuilder(CuotaAmortizacion, 'ca')
        .select('COALESCE(MAX(CURRENT_DATE - ca.fecha_vencimiento::date), 0)', 'dias')
        .where('ca.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('ca.fecha_vencimiento < CURRENT_DATE')
        .andWhere('ca.estado IN (:...e)', {
          e: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
        })
        .getRawOne<{ dias: string }>();

      await tx.update(Prestamo, { id: dto.prestamo_id }, {
        estado: EstadoPrestamo.VENCIDO,
        notas: `${prestamo.notas ?? ''}\n[VENCIDO ${fechaHoyRD()}]: ${dto.motivo}`,
      });

      // Reportar automáticamente al buró si hay deuda real
      if (dto.reportar_buro !== false && saldoFinal > 0 && cliente?.cedula) {
        const motivo = parseInt(diasMora.dias, 10) > 60
          ? 'ImpagoTotal'
          : 'MoraExtendida';

        const nivel =
          motivo === 'ImpagoTotal' || saldoFinal > (prestamo.capital_aprobado * 0.7)
            ? 'CriticoNoPrestable'
            : 'Alto';

        await this.buroCreditoService.reportarAutomatico({
          cedula: cliente.cedula,
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          telefono: cliente.telefono,
          tenantId,
          tenantNombre: tenant?.nombre_empresa ?? 'Desconocida',
          prestamoId: prestamo.id,
          capitalOriginal: prestamo.capital_aprobado,
          saldoImpagado: saldoFinal,
          diasMora: parseInt(diasMora.dias, 10),
          motivo,
          nivelRiesgo: nivel as any,
          descripcion: dto.motivo,
        });
      }
    });
  }

  // ─── CONSULTAS ─────────────────────────────────────────────────────────────

  async listarPorRuta(tenantId: string, rutaId: string) {
    return this.prestamoRepo.find({
      where: { tenant_id: tenantId, ruta_id: rutaId, estado: EstadoPrestamo.ACTIVO },
      order: { created_at: 'DESC' },
    });
  }

  async obtenerConCuotas(tenantId: string, prestamoId: string) {
    const prestamo = await this.prestamoRepo.findOne({
      where: { id: prestamoId, tenant_id: tenantId },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    const cuotas = await this.cuotaRepo.find({
      where: { prestamo_id: prestamoId },
      order: { numero_cuota: 'ASC' },
    });

    return { prestamo, cuotas };
  }

  async obtenerResumenSaldo(tenantId: string, prestamoId: string) {
    const result = await this.em.query<any[]>(`
      SELECT
        p.id,
        p.estado,
        p.capital_aprobado,
        COALESCE(SUM(ca.monto_total - ca.monto_pagado), 0) AS saldo_cuotas,
        COALESCE((
          SELECT SUM(cm.monto_mora - cm.monto_pagado)
          FROM cargos_mora cm
          WHERE cm.prestamo_id = p.id AND cm.estado = 'Pendiente'
        ), 0) AS saldo_mora,
        COUNT(ca.id) FILTER (WHERE ca.estado IN ('Pendiente','Abonado','Vencida')) AS cuotas_pendientes,
        COUNT(ca.id) FILTER (WHERE ca.estado = 'Vencida') AS cuotas_vencidas
      FROM prestamos p
      LEFT JOIN cuotas_amortizacion ca ON ca.prestamo_id = p.id
      WHERE p.id = $1 AND p.tenant_id = $2
      GROUP BY p.id
    `, [prestamoId, tenantId]);

    if (!result[0]) throw new NotFoundException('Préstamo no encontrado');
    return result[0];
  }

  // ─── PANEL WEB: LISTAR / OBTENER / RECHAZAR ────────────────────────────────

  async listar(
    tenantId: string,
    page: number,
    limit: number,
    estado?: string,
    clienteId?: string,
    cobradorId?: string,
  ) {
    const where: Record<string, unknown> = { tenant_id: tenantId };
    if (estado) where.estado = estado;
    if (clienteId) where.cliente_id = clienteId;
    if (cobradorId) where.cobrador_id = cobradorId;

    const [data, total] = await this.prestamoRepo.findAndCount({
      where,
      relations: ['cliente'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: data.map((p) => this.mapPrestamo(p)), total, page, limit };
  }

  async obtener(tenantId: string, prestamoId: string, cobradorId?: string) {
    const where: Record<string, unknown> = { id: prestamoId, tenant_id: tenantId };
    if (cobradorId) where.cobrador_id = cobradorId;

    const prestamo = await this.prestamoRepo.findOne({
      where,
      relations: ['cliente'],
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');

    const cuotas = await this.cuotaRepo.find({
      where: { prestamo_id: prestamoId },
      order: { numero_cuota: 'ASC' },
    });

    return this.mapPrestamo(prestamo, cuotas);
  }

  async rechazar(tenantId: string, prestamoId: string, dto: RechazarPrestamoDto) {
    const prestamo = await this.prestamoRepo.findOne({
      where: { id: prestamoId, tenant_id: tenantId, estado: EstadoPrestamo.PENDIENTE },
    });
    if (!prestamo) throw new NotFoundException('Solicitud no encontrada o ya procesada');

    prestamo.estado = EstadoPrestamo.RECHAZADO;
    prestamo.notas = `${prestamo.notas ?? ''}\n[RECHAZADO ${fechaHoyRD()}]: ${dto.motivo}`.trim();

    const guardado = await this.prestamoRepo.save(prestamo);
    return this.mapPrestamo(guardado);
  }

  /** Adapta la entidad Prestamo al formato consumido por el panel web. */
  mapPrestamo(p: Prestamo, cuotas?: CuotaAmortizacion[]) {
    return {
      id: p.id,
      cliente_id: p.cliente_id,
      cliente: p.cliente
        ? { nombre: p.cliente.nombre, apellido: p.cliente.apellido, cedula: p.cliente.cedula }
        : undefined,
      cobrador_id: p.cobrador_id,
      ruta_id: p.ruta_id,
      capital_aprobado: p.capital_aprobado ?? p.capital_solicitado,
      tasa_interes: p.tasa_interes_pactada,
      num_cuotas: p.numero_cuotas,
      modalidad: p.modalidad,
      estado: p.estado,
      fecha_aprobacion: p.fecha_aprobacion,
      fecha_primer_vencimiento: p.fecha_primer_pago,
      cuotas: cuotas ?? p.cuotas,
      created_at: p.created_at,
    };
  }
}
