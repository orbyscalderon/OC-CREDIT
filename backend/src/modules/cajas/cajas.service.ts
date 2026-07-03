import {
  BadRequestException, ForbiddenException,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { Transaccion } from './entities/transaccion.entity';
import { AbrirCajaDto, ArqueoCajaResponseDto, CerrarCajaDto, RegistrarGastoDto } from './dto/cajas.dto';
import { EstadoCaja, Rol, TipoTransaccion } from '../../common/constants/roles.enum';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { fechaHoyRD } from '../../common/utils/fecha-negocio.util';

@Injectable()
export class CajasService {
  private readonly logger = new Logger(CajasService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    @InjectRepository(Caja) private readonly cajaRepo: Repository<Caja>,
    @InjectRepository(Transaccion) private readonly txRepo: Repository<Transaccion>,
  ) {}

  // ─── APERTURA ──────────────────────────────────────────────────────────────

  async abrir(
    tenantId: string,
    cobradorId: string,
    dto: AbrirCajaDto,
  ): Promise<Caja> {
    const hoy = fechaHoyRD();

    // Verificar que no existe caja abierta hoy PARA ESTA RUTA. Un cobrador
    // que atiende varias rutas el mismo día puede tener varias cajas
    // abiertas a la vez, una por ruta (uq_caja_cobrador_ruta_fecha).
    const existente = await this.cajaRepo.findOne({
      where: { tenant_id: tenantId, cobrador_id: cobradorId, ruta_id: dto.ruta_id, fecha: hoy },
    });
    if (existente) {
      if (existente.estado === EstadoCaja.ABIERTA) {
        return existente; // Idempotente: retorna la caja si ya está abierta
      }
      throw new BadRequestException('Ya existe una caja cerrada para esta ruta hoy. No se puede reabrir.');
    }

    return this.em.transaction(async (tx) => {
      const caja = tx.create(Caja, {
        tenant_id: tenantId,
        cobrador_id: cobradorId,
        ruta_id: dto.ruta_id,
        fecha: hoy,
        monto_apertura: dto.monto_apertura,
        latitud_apertura: dto.latitud ?? null,
        longitud_apertura: dto.longitud ?? null,
        hora_apertura: new Date(),
        estado: EstadoCaja.ABIERTA,
      });

      const saved = await tx.save(Caja, caja);

      // Registrar transacción de apertura. uuid_idempotencia es columna `uuid`
      // única en Postgres: generar un UUID propio en vez de un string con
      // prefijo ("apertura-<uuid>"), que rompe la sintaxis de tipo uuid. No
      // puede reutilizar saved.id porque cerrar() también necesita un valor
      // distinto para su propia transacción de la misma caja.
      await tx.save(Transaccion, tx.create(Transaccion, {
        uuid_idempotencia: crypto.randomUUID(),
        tenant_id: tenantId,
        caja_id: saved.id,
        cobrador_id: cobradorId,
        tipo: TipoTransaccion.APERTURA,
        monto: dto.monto_apertura || 0.01, // Mínimo para evitar constraint
        descripcion: 'Apertura de caja',
        latitud_transaccion: dto.latitud ?? null,
        longitud_transaccion: dto.longitud ?? null,
      }));

      this.logger.log(`Caja abierta: id=${saved.id} cobrador=${cobradorId} fecha=${hoy}`);
      return saved;
    });
  }

  // ─── CIERRE CIEGO ──────────────────────────────────────────────────────────
  // El cobrador declara cuánto tiene físicamente sin ver el esperado.
  // La diferencia se calcula aquí pero NO se retorna al cobrador — solo al Admin.

  async cerrar(
    tenantId: string,
    cobradorId: string,
    dto: CerrarCajaDto,
  ): Promise<{ mensaje: string; caja_id: string }> {
    return this.em.transaction(async (tx) => {
      const caja = await tx
        .createQueryBuilder(Caja, 'c')
        .where('c.id = :id', { id: dto.caja_id })
        .andWhere('c.tenant_id = :tid', { tid: tenantId })
        .andWhere('c.cobrador_id = :cid', { cid: cobradorId })
        .andWhere('c.estado = :estado', { estado: EstadoCaja.ABIERTA })
        .setLock('pessimistic_write')
        .getOne();

      if (!caja) throw new NotFoundException('Caja activa no encontrada');

      // Calcular monto esperado final (redundante por columna generada, pero explícito)
      const montoEsperado = caja.monto_apertura + caja.total_cobros - caja.total_gastos;
      const diferencia = dto.monto_cierre_declarado - montoEsperado;

      await tx.update(Caja, { id: dto.caja_id }, {
        estado: EstadoCaja.CERRADA,
        monto_cierre_declarado: dto.monto_cierre_declarado,
        diferencia_cierre: Math.round(diferencia * 100) / 100,
        latitud_cierre: dto.latitud ?? null,
        longitud_cierre: dto.longitud ?? null,
        hora_cierre: new Date(),
        nota_cierre: dto.nota_cierre ?? null,
      });

      // uuid_idempotencia es columna `uuid` única: generar un UUID propio en
      // vez de un string con prefijo ("cierre-<uuid>"), que rompe la sintaxis
      // uuid. No puede reutilizar caja_id porque colisiona con el valor ya
      // usado por la transacción de apertura de esa misma caja.
      await tx.save(Transaccion,
        tx.create(Transaccion, {
          uuid_idempotencia: crypto.randomUUID(),
          tenant_id: tenantId,
          caja_id: dto.caja_id,
          cobrador_id: cobradorId,
          tipo: TipoTransaccion.CIERRE,
          monto: dto.monto_cierre_declarado || 0.01,
          descripcion: dto.nota_cierre ?? 'Cierre de caja',
          latitud_transaccion: dto.latitud ?? null,
          longitud_transaccion: dto.longitud ?? null,
        }),
      );

      this.logger.log(
        `Caja cerrada: id=${dto.caja_id} declarado=${dto.monto_cierre_declarado} ` +
        `esperado=${montoEsperado} diferencia=${diferencia}`,
      );

      // Respuesta al cobrador: NO incluye diferencia_cierre
      return {
        mensaje: 'Caja cerrada exitosamente. El arqueo será revisado por el administrador.',
        caja_id: dto.caja_id,
      };
    });
  }

  // ─── REGISTRAR GASTO DE RUTA ───────────────────────────────────────────────

  async registrarGasto(
    tenantId: string,
    cobradorId: string,
    dto: RegistrarGastoDto,
  ): Promise<Transaccion> {
    return this.em.transaction(async (tx) => {
      // Idempotencia
      const existente = await tx.findOne(Transaccion, {
        where: { uuid_idempotencia: dto.uuid_idempotencia },
        select: ['id'],
      });
      if (existente) return tx.findOne(Transaccion, { where: { id: existente.id } });

      const caja = await tx
        .createQueryBuilder(Caja, 'c')
        .where('c.id = :id', { id: dto.caja_id })
        .andWhere('c.tenant_id = :tid', { tid: tenantId })
        .andWhere('c.cobrador_id = :cid', { cid: cobradorId })
        .andWhere('c.estado = :estado', { estado: EstadoCaja.ABIERTA })
        .setLock('pessimistic_write')
        .getOne();

      if (!caja) throw new NotFoundException('Caja activa no encontrada');

      const gasto = tx.create(Transaccion, {
        uuid_idempotencia: dto.uuid_idempotencia,
        tenant_id: tenantId,
        caja_id: dto.caja_id,
        cobrador_id: cobradorId,
        tipo: TipoTransaccion.GASTO,
        monto: dto.monto,
        descripcion: dto.descripcion,
        foto_comprobante_url: dto.foto_comprobante_url ?? null,
        latitud_transaccion: dto.latitud ?? null,
        longitud_transaccion: dto.longitud ?? null,
        sincronizado_offline: dto.sincronizado_offline ?? false,
        timestamp_dispositivo: dto.timestamp_dispositivo
          ? new Date(dto.timestamp_dispositivo)
          : new Date(),
      });

      const saved = await tx.save(Transaccion, gasto);

      // Actualizar total_gastos de la caja
      await tx
        .createQueryBuilder()
        .update(Caja)
        .set({ total_gastos: () => `total_gastos + ${dto.monto}` })
        .where('id = :id', { id: dto.caja_id })
        .execute();

      return saved;
    });
  }

  // ─── OBTENER CAJA(S) ACTIVA(S) ──────────────────────────────────────────────
  // Un cobrador puede tener varias cajas abiertas a la vez (una por ruta).
  // Con ruta_id devuelve esa caja puntual; sin filtro, todas las activas.

  async obtenerCajaActiva(tenantId: string, cobradorId: string, rutaId?: string): Promise<Caja | Caja[]> {
    if (rutaId) {
      const caja = await this.cajaRepo.findOne({
        where: { tenant_id: tenantId, cobrador_id: cobradorId, ruta_id: rutaId, estado: EstadoCaja.ABIERTA },
      });
      if (!caja) throw new NotFoundException('No hay caja activa para esa ruta. Inicie la jornada primero.');
      return caja;
    }

    return this.cajaRepo.find({
      where: { tenant_id: tenantId, cobrador_id: cobradorId, estado: EstadoCaja.ABIERTA },
      relations: ['ruta'],
    });
  }

  // ─── ARQUEO DETALLADO (solo Admin) ────────────────────────────────────────

  async obtenerArqueo(
    tenantId: string,
    cajaId: string,
    user: JwtPayload,
  ): Promise<ArqueoCajaResponseDto> {
    const caja = await this.em
      .createQueryBuilder(Caja, 'c')
      .leftJoin('c.cobrador', 'emp')
      .addSelect(['emp.nombre', 'emp.apellido'])
      .leftJoin('c.ruta', 'rt')
      .addSelect(['rt.nombre'])
      .where('c.id = :id', { id: cajaId })
      .andWhere('c.tenant_id = :tid', { tid: tenantId })
      .getOne();

    if (!caja) throw new NotFoundException('Caja no encontrada');

    const esAdmin = user.rol === Rol.ADMIN_TENANT;

    const estadoCuadre =
      !caja.diferencia_cierre ? undefined :
      Math.abs(caja.diferencia_cierre) < 0.01 ? 'Cuadrado' :
      caja.diferencia_cierre > 0 ? 'Sobrante' : 'Faltante';

    return {
      caja_id: caja.id,
      cobrador_nombre: caja.cobrador
        ? `${(caja.cobrador as any).nombre} ${(caja.cobrador as any).apellido}`
        : '---',
      ruta_nombre: caja.ruta ? (caja.ruta as any).nombre : null,
      fecha: caja.fecha,
      estado: caja.estado,
      monto_apertura: caja.monto_apertura,
      total_cobros: caja.total_cobros,
      total_gastos: caja.total_gastos,
      monto_esperado: caja.monto_esperado,
      // Cierre ciego: solo Admin ve la diferencia
      ...(esAdmin && {
        monto_cierre_declarado: caja.monto_cierre_declarado,
        diferencia_cierre: caja.diferencia_cierre,
        estado_cuadre: estadoCuadre,
      }),
    };
  }

  async listarCajasDia(tenantId: string, fecha?: string): Promise<Caja[]> {
    const f = fecha ?? fechaHoyRD();
    return this.cajaRepo.find({
      where: { tenant_id: tenantId, fecha: f },
      relations: ['cobrador', 'ruta'],
      order: { hora_apertura: 'ASC' },
    });
  }
}
