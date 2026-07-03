import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { RegistrarCobroDto, CobroResponseDto } from './dto/registrar-cobro.dto';
import { Transaccion } from '../cajas/entities/transaccion.entity';
import { Caja } from '../cajas/entities/caja.entity';
import { CuotaAmortizacion } from '../prestamos/entities/cuota-amortizacion.entity';
import { Prestamo } from '../prestamos/entities/prestamo.entity';
import { CargoMora } from '../mora/entities/cargo-mora.entity';
import {
  EstadoCaja, EstadoCuota, EstadoPrestamo,
  EstadoCargoMora, TipoTransaccion,
} from '../../common/constants/roles.enum';
import { fechaHoyRD } from '../../common/utils/fecha-negocio.util';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface PaymentDistribution {
  mora_absorbida: number;
  interes_absorbido: number;
  capital_absorbido: number;
  excedente: number;
  cuotas_afectadas: string[];
  moras_pagadas: string[];
}

interface PrestamoResumen {
  estado: string;
  cuotas_pendientes: number;
  saldo_total_pendiente: number;
}

// ─── Helpers de aritmética financiera (trabaja en centavos para evitar float) ─

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

function minCents(a: number, b: number): number {
  return Math.min(a, b);
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

@Injectable()
export class CobrosService {
  private readonly logger = new Logger(CobrosService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  /**
   * Registra un cobro de forma ATÓMICA dentro de una transacción de BD.
   *
   * Orden de absorción del pago (invariante de negocio):
   *   1° Mora acumulada (cargos_mora pendientes, de más antigua a más reciente)
   *   2° Interés de la cuota más antigua pendiente
   *   3° Capital de la cuota más antigua pendiente
   *   → Repite 2° y 3° para cada cuota hasta agotar el monto cobrado
   */
  async registrarCobro(
    tenantId: string,
    userEmpleadoId: string,
    esAdminUSupervisor: boolean,
    dto: RegistrarCobroDto,
  ): Promise<CobroResponseDto> {
    return this.em.transaction('SERIALIZABLE', async (tx) => {

      // ── 1. IDEMPOTENCIA ──────────────────────────────────────────────────
      const existente = await tx.findOne(Transaccion, {
        where: { uuid_idempotencia: dto.uuid_idempotencia },
        select: ['id'],
      });

      if (existente) {
        this.logger.warn(
          `UUID duplicado recibido: ${dto.uuid_idempotencia} → ignorado`,
        );
        throw new ConflictException({
          code: 'DUPLICATE_UUID',
          message: 'Transacción ya procesada. Pago descartado para evitar duplicado.',
          transaccion_id: existente.id,
        });
      }

      // ── 2. VALIDAR CAJA ACTIVA (lock pesimista para evitar race conditions) ─
      // Admin/supervisor pueden usar la caja de CUALQUIER cobrador del tenant
      // (cobro manual desde oficina); un cobrador solo puede usar la suya.
      const cajaQuery = tx
        .createQueryBuilder(Caja, 'c')
        .where('c.id = :id', { id: dto.caja_id })
        .andWhere('c.tenant_id = :tid', { tid: tenantId })
        .andWhere('c.estado = :estado', { estado: EstadoCaja.ABIERTA });
      if (!esAdminUSupervisor) {
        cajaQuery.andWhere('c.cobrador_id = :cid', { cid: userEmpleadoId });
      }
      const caja = await cajaQuery.setLock('pessimistic_write').getOne();

      if (!caja) {
        throw new NotFoundException(
          'Caja activa no encontrada. Verifique que la jornada esté iniciada.',
        );
      }

      // El cobro se atribuye al DUEÑO de la caja (en cuya jornada entra el
      // efectivo), no a quien hace clic — así un admin puede registrar desde
      // oficina sin que la caja del cobrador real quede inconsistente.
      const cobradorDeLaCaja = caja.cobrador_id;

      // ── 3. VALIDAR Y BLOQUEAR PRÉSTAMO ──────────────────────────────────
      const prestamo = await tx
        .createQueryBuilder(Prestamo, 'p')
        .where('p.id = :id', { id: dto.prestamo_id })
        .andWhere('p.tenant_id = :tid', { tid: tenantId })
        .andWhere('p.estado = :estado', { estado: EstadoPrestamo.ACTIVO })
        .setLock('pessimistic_write')
        .getOne();

      if (!prestamo) {
        throw new NotFoundException(
          `Préstamo ${dto.prestamo_id} no encontrado o no está activo.`,
        );
      }

      // ── 4. VERIFICAR ASIGNACIÓN DEL COBRADOR ────────────────────────────
      // El préstamo debe estar asignado al MISMO cobrador dueño de la caja
      // seleccionada — no se puede cobrar un préstamo de Pedro hacia la caja
      // de María, sin importar quién esté haciendo la solicitud.
      if (prestamo.cobrador_id !== cobradorDeLaCaja) {
        throw new ForbiddenException(
          'Este préstamo no está asignado al cobrador dueño de esa caja.',
        );
      }

      // ── 5. OBTENER MORAS PENDIENTES (más antigua primero, con lock) ──────
      const morasPendientes = await tx
        .createQueryBuilder(CargoMora, 'cm')
        .where('cm.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('cm.tenant_id = :tid', { tid: tenantId })
        .andWhere('cm.estado = :estado', { estado: EstadoCargoMora.PENDIENTE })
        .orderBy('cm.fecha_generacion', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      // ── 6. OBTENER CUOTAS PENDIENTES (más antigua primero, con lock) ─────
      const cuotasPendientes = await tx
        .createQueryBuilder(CuotaAmortizacion, 'ca')
        .where('ca.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('ca.tenant_id = :tid', { tid: tenantId })
        .andWhere('ca.estado IN (:...estados)', {
          estados: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
        })
        .orderBy('ca.numero_cuota', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      if (cuotasPendientes.length === 0) {
        throw new BadRequestException(
          'El préstamo no tiene cuotas pendientes de cobro.',
        );
      }

      // ── 7. ALGORITMO DE DISTRIBUCIÓN EN CASCADA ─────────────────────────
      const distribucion = await this.aplicarCascada(
        tx,
        dto.monto_cobrado,
        morasPendientes,
        cuotasPendientes,
      );

      // ── 8. EVALUAR SI EL PRÉSTAMO QUEDÓ COMPLETAMENTE PAGADO ────────────
      const cuotasRestantes = await tx.count(CuotaAmortizacion, {
        where: [
          { prestamo_id: dto.prestamo_id, estado: EstadoCuota.PENDIENTE },
          { prestamo_id: dto.prestamo_id, estado: EstadoCuota.ABONADO },
          { prestamo_id: dto.prestamo_id, estado: EstadoCuota.VENCIDA },
        ],
      });

      let estadoFinalPrestamo = prestamo.estado;
      if (cuotasRestantes === 0) {
        estadoFinalPrestamo = EstadoPrestamo.PAGADO;
        await tx.update(Prestamo, { id: prestamo.id }, {
          estado: EstadoPrestamo.PAGADO,
        });
        this.logger.log(`Préstamo ${prestamo.id} marcado como PAGADO`);
      }

      // ── 9. CREAR REGISTRO DE TRANSACCIÓN ────────────────────────────────
      const transaccion = tx.create(Transaccion, {
        uuid_idempotencia: dto.uuid_idempotencia,
        tenant_id: tenantId,
        caja_id: dto.caja_id,
        cobrador_id: cobradorDeLaCaja,
        cliente_id: prestamo.cliente_id,
        prestamo_id: dto.prestamo_id,
        tipo: TipoTransaccion.COBRO,
        monto: dto.monto_cobrado,
        distribucion_pago: {
          mora: distribucion.mora_absorbida,
          interes: distribucion.interes_absorbido,
          capital: distribucion.capital_absorbido,
          excedente: distribucion.excedente,
          cuotas_afectadas: distribucion.cuotas_afectadas,
          moras_pagadas: distribucion.moras_pagadas,
        },
        descripcion: dto.descripcion ?? null,
        latitud_transaccion: dto.latitud ?? null,
        longitud_transaccion: dto.longitud ?? null,
        precision_gps: dto.precision_gps ?? null,
        sincronizado_offline: dto.sincronizado_offline ?? false,
        timestamp_dispositivo: dto.timestamp_dispositivo
          ? new Date(dto.timestamp_dispositivo)
          : new Date(),
      });

      const txGuardada = await tx.save(Transaccion, transaccion);

      // ── 10. ACTUALIZAR TOTALES DE LA CAJA ───────────────────────────────
      // Usamos SQL aritmético para evitar lecturas sucias en concurrencia alta
      await tx
        .createQueryBuilder()
        .update(Caja)
        .set({
          total_cobros: () => `total_cobros + ${dto.monto_cobrado}`,
        })
        .where('id = :id', { id: dto.caja_id })
        .execute();

      // ── 11. ACTUALIZAR transaccion_id EN LAS MORAS PAGADAS ──────────────
      if (distribucion.moras_pagadas.length > 0) {
        await tx
          .createQueryBuilder()
          .update(CargoMora)
          .set({ transaccion_id: txGuardada.id })
          .whereInIds(distribucion.moras_pagadas)
          .execute();
      }

      // ── 12. CALCULAR SALDO PENDIENTE PARA LA RESPUESTA ──────────────────
      const saldoResult = await tx
        .createQueryBuilder(CuotaAmortizacion, 'ca')
        .select('COALESCE(SUM(ca.monto_total - ca.monto_pagado), 0)', 'saldo')
        .addSelect('COUNT(*)', 'cantidad')
        .where('ca.prestamo_id = :pid', { pid: dto.prestamo_id })
        .andWhere('ca.estado IN (:...estados)', {
          estados: [EstadoCuota.PENDIENTE, EstadoCuota.ABONADO, EstadoCuota.VENCIDA],
        })
        .getRawOne<{ saldo: string; cantidad: string }>();

      const resumen: PrestamoResumen = {
        estado: estadoFinalPrestamo,
        cuotas_pendientes: parseInt(saldoResult?.cantidad ?? '0', 10),
        saldo_total_pendiente: parseFloat(saldoResult?.saldo ?? '0'),
      };

      this.logger.log(
        `Cobro registrado: tenant=${tenantId} prestamo=${dto.prestamo_id} ` +
        `monto=${dto.monto_cobrado} tx=${txGuardada.id}`,
      );

      return {
        transaccion_id: txGuardada.id,
        prestamo_id: dto.prestamo_id,
        distribucion: {
          mora_absorbida: distribucion.mora_absorbida,
          interes_absorbido: distribucion.interes_absorbido,
          capital_absorbido: distribucion.capital_absorbido,
          excedente: distribucion.excedente,
        },
        prestamo_resumen: resumen,
        timestamp_procesado: new Date().toISOString(),
      };
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ALGORITMO DE CASCADA (mora → interés → capital)
  // Opera en centavos para eliminar errores de punto flotante.
  // ───────────────────────────────────────────────────────────────────────────
  private async aplicarCascada(
    tx: EntityManager,
    montoTotal: number,
    moras: CargoMora[],
    cuotas: CuotaAmortizacion[],
  ): Promise<PaymentDistribution> {
    let saldoCents = toCents(montoTotal);

    const resultado: PaymentDistribution = {
      mora_absorbida: 0,
      interes_absorbido: 0,
      capital_absorbido: 0,
      excedente: 0,
      cuotas_afectadas: [],
      moras_pagadas: [],
    };

    // ═══════════════════════════════════════════════════════════════
    // PRIORIDAD 1 — ABSORBER TODA LA MORA ACUMULADA
    // ═══════════════════════════════════════════════════════════════
    for (const mora of moras) {
      if (saldoCents <= 0) break;

      const moraPendienteCents = toCents(mora.monto_mora) - toCents(mora.monto_pagado);
      if (moraPendienteCents <= 0) continue;

      const abonoCents = minCents(saldoCents, moraPendienteCents);
      const abonoDecimal = fromCents(abonoCents);

      mora.monto_pagado = fromCents(toCents(mora.monto_pagado) + abonoCents);
      saldoCents -= abonoCents;
      resultado.mora_absorbida += abonoDecimal;

      if (toCents(mora.monto_pagado) >= toCents(mora.monto_mora)) {
        mora.estado = EstadoCargoMora.PAGADO;
        mora.fecha_pago = fechaHoyRD();
        resultado.moras_pagadas.push(mora.id);
      }

      await tx.save(CargoMora, mora);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIORIDAD 2 y 3 — INTERÉS luego CAPITAL por cada cuota
    // ═══════════════════════════════════════════════════════════════
    for (const cuota of cuotas) {
      if (saldoCents <= 0) break;

      let cuotaModificada = false;

      // — PRIORIDAD 2: Absorber interés de la cuota más antigua —
      const interesPendienteCents =
        toCents(cuota.interes) - toCents(cuota.interes_pagado);

      if (interesPendienteCents > 0) {
        const abonoCents = minCents(saldoCents, interesPendienteCents);
        const abonoDecimal = fromCents(abonoCents);

        cuota.interes_pagado = fromCents(toCents(cuota.interes_pagado) + abonoCents);
        cuota.monto_pagado   = fromCents(toCents(cuota.monto_pagado) + abonoCents);
        saldoCents -= abonoCents;
        resultado.interes_absorbido += abonoDecimal;
        cuotaModificada = true;
      }

      // — PRIORIDAD 3: Absorber capital de la misma cuota —
      const capitalPendienteCents =
        toCents(cuota.capital) - toCents(cuota.capital_pagado);

      if (capitalPendienteCents > 0 && saldoCents > 0) {
        const abonoCents = minCents(saldoCents, capitalPendienteCents);
        const abonoDecimal = fromCents(abonoCents);

        cuota.capital_pagado = fromCents(toCents(cuota.capital_pagado) + abonoCents);
        cuota.monto_pagado   = fromCents(toCents(cuota.monto_pagado) + abonoCents);
        saldoCents -= abonoCents;
        resultado.capital_absorbido += abonoDecimal;
        cuotaModificada = true;
      }

      // — Actualizar estado de la cuota —
      if (cuotaModificada) {
        const montoPagadoCents = toCents(cuota.monto_pagado);
        const montoTotalCents  = toCents(cuota.monto_total);

        if (montoPagadoCents >= montoTotalCents) {
          cuota.estado     = EstadoCuota.PAGADO;
          cuota.fecha_pago = fechaHoyRD();
        } else {
          cuota.estado = EstadoCuota.ABONADO;
        }

        await tx.save(CuotaAmortizacion, cuota);
        resultado.cuotas_afectadas.push(cuota.id);
      }
    }

    resultado.excedente = fromCents(saldoCents);

    return resultado;
  }

  // ─── Consulta de estado de cobros de una caja ────────────────────────────

  async getCobrosDeCaja(
    tenantId: string,
    cajaId: string,
    cobradorId: string,
  ) {
    return this.em
      .createQueryBuilder(Transaccion, 't')
      .leftJoinAndSelect('t.cobrador', 'cobrador')
      .where('t.caja_id = :cajaId', { cajaId })
      .andWhere('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.cobrador_id = :cobradorId', { cobradorId })
      .andWhere('t.tipo = :tipo', { tipo: TipoTransaccion.COBRO })
      .orderBy('t.timestamp_dispositivo', 'ASC')
      .getMany();
  }
}
