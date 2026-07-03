import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Ruta } from './entities/ruta.entity';
import { NovedadRuta } from './entities/novedad-ruta.entity';
import { CrearRutaDto, RegistrarNovedadDto } from './dto/rutas.dto';
import { fechaHoyRD } from '../../common/utils/fecha-negocio.util';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta) private readonly rutaRepo: Repository<Ruta>,
    @InjectRepository(NovedadRuta) private readonly novedadRepo: Repository<NovedadRuta>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async crear(tenantId: string, dto: CrearRutaDto): Promise<Ruta> {
    return this.rutaRepo.save(
      this.rutaRepo.create({ ...dto, tenant_id: tenantId }),
    );
  }

  async listar(tenantId: string, incluirInactivas = false): Promise<Ruta[]> {
    return this.rutaRepo.find({
      where: incluirInactivas ? { tenant_id: tenantId } : { tenant_id: tenantId, activa: true },
      relations: ['cobrador'],
      order: { nombre: 'ASC' },
    });
  }

  async obtener(tenantId: string, id: string): Promise<Ruta> {
    const ruta = await this.rutaRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['cobrador'],
    });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    return ruta;
  }

  /**
   * Desactivar/reactivar una ruta. No se borra la fila — clientes, préstamos
   * y cajas ya creados referencian ruta_id y perderían su historial si se
   * eliminara de verdad. Una ruta desactivada deja de aparecer en los
   * selectores operativos (abrir caja, nuevo cliente, nuevo préstamo) pero
   * conserva todo lo asociado.
   */
  async toggleActiva(tenantId: string, id: string, activa: boolean): Promise<Ruta> {
    const ruta = await this.rutaRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    ruta.activa = activa;
    return this.rutaRepo.save(ruta);
  }

  /** Rutas asignadas a un cobrador — para que el cobrador sepa a quién debe cobrarle. */
  async listarDeCobrador(tenantId: string, cobradorId: string): Promise<Ruta[]> {
    return this.rutaRepo.find({
      where: { tenant_id: tenantId, cobrador_id: cobradorId, activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async asignarCobrador(tenantId: string, rutaId: string, cobradorId: string): Promise<void> {
    const ruta = await this.rutaRepo.findOne({ where: { id: rutaId, tenant_id: tenantId } });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    ruta.cobrador_id = cobradorId;
    await this.rutaRepo.save(ruta);
  }

  /**
   * Registra una novedad (Cliente_No_Estaba / Cliente_Sin_Dinero).
   * GPS es OBLIGATORIO para validar la visita física en auditoría.
   */
  async registrarNovedad(
    tenantId: string,
    cobradorId: string,
    dto: RegistrarNovedadDto,
  ): Promise<NovedadRuta> {
    // Idempotencia por UUID
    const existente = await this.em
      .createQueryBuilder(NovedadRuta, 'n')
      .where('n.tenant_id = :tid', { tid: tenantId })
      .andWhere('n.cobrador_id = :cid', { cid: cobradorId })
      .andWhere('n.cliente_id = :clid', { clid: dto.cliente_id })
      .andWhere('n.timestamp_dispositivo = :ts', {
        ts: dto.timestamp_dispositivo ? new Date(dto.timestamp_dispositivo) : null,
      })
      .getOne();

    if (existente) return existente;

    return this.novedadRepo.save(
      this.novedadRepo.create({
        tenant_id: tenantId,
        cobrador_id: cobradorId,
        cliente_id: dto.cliente_id,
        prestamo_id: dto.prestamo_id ?? null,
        caja_id: dto.caja_id,
        tipo: dto.tipo,
        descripcion: dto.descripcion ?? null,
        latitud: dto.latitud,
        longitud: dto.longitud,
        precision_gps: dto.precision_gps ?? null,
        foto_url: dto.foto_url ?? null,
        sincronizado_offline: dto.sincronizado_offline ?? false,
        timestamp_dispositivo: dto.timestamp_dispositivo
          ? new Date(dto.timestamp_dispositivo)
          : new Date(),
      }),
    );
  }

  async novedadesDia(tenantId: string, fecha?: string) {
    const f = fecha ?? fechaHoyRD();
    return this.em
      .createQueryBuilder(NovedadRuta, 'n')
      .where('n.tenant_id = :tid', { tid: tenantId })
      .andWhere('DATE(n.created_at) = :f', { f })
      .orderBy('n.created_at', 'DESC')
      .getMany();
  }

  /**
   * Coordenadas para el mapa Leaflet (panel Admin). rutaId es opcional: sin
   * él, trae todo el tenant. Devuelve dos grupos separados: `eventos` (cobros
   * y novedades del día, para la trayectoria) y `clientes` (ubicación
   * permanente de cada cliente — dónde se entrega y cobra el préstamo —, sin
   * filtrar por fecha, para que la ruta siempre muestre todos sus clientes).
   */
  async coordenadasGps(tenantId: string, fecha?: string, rutaId?: string) {
    const f = fecha ?? fechaHoyRD();
    const params: string[] = [tenantId, f];
    let filtroRutaCobro = '';
    let filtroRutaNovedad = '';

    if (rutaId) {
      params.push(rutaId);
      filtroRutaCobro = 'AND p.ruta_id = $3';
      filtroRutaNovedad = 'AND cl.ruta_id = $3';
    }

    const eventos = await this.em.query<any[]>(`
      SELECT
        t.id, 'cobro' AS tipo, t.latitud_transaccion AS lat, t.longitud_transaccion AS lng,
        t.timestamp_dispositivo AS created_at, t.monto, t.descripcion,
        emp.nombre, emp.apellido
      FROM transacciones t
      JOIN empleados emp ON emp.id = t.cobrador_id
      LEFT JOIN prestamos p ON p.id = t.prestamo_id
      WHERE t.tenant_id = $1
        AND t.tipo = 'Cobro'
        AND DATE(t.created_at) = $2
        AND t.latitud_transaccion IS NOT NULL
        ${filtroRutaCobro}
      UNION ALL
      SELECT
        n.id, 'novedad' AS tipo, n.latitud AS lat, n.longitud AS lng,
        n.timestamp_dispositivo AS created_at, 0 AS monto, n.descripcion,
        emp.nombre, emp.apellido
      FROM novedades_ruta n
      JOIN empleados emp ON emp.id = n.cobrador_id
      LEFT JOIN clientes cl ON cl.id = n.cliente_id
      WHERE n.tenant_id = $1
        AND DATE(n.created_at) = $2
        ${filtroRutaNovedad}
      ORDER BY created_at ASC
    `, params);

    const clientesParams: string[] = [tenantId];
    let filtroRutaCliente = '';
    if (rutaId) {
      clientesParams.push(rutaId);
      filtroRutaCliente = 'AND cl.ruta_id = $2';
    }

    const clientes = await this.em.query<any[]>(`
      SELECT
        cl.id, cl.nombre, cl.apellido, cl.cedula,
        cl.latitud_casa AS lat, cl.longitud_casa AS lng,
        cl.direccion_casa,
        COUNT(p.id) FILTER (WHERE p.estado = 'Activo') AS prestamos_activos
      FROM clientes cl
      LEFT JOIN prestamos p ON p.cliente_id = cl.id
      WHERE cl.tenant_id = $1
        AND cl.activo = TRUE
        AND cl.latitud_casa IS NOT NULL AND cl.longitud_casa IS NOT NULL
        ${filtroRutaCliente}
      GROUP BY cl.id, cl.nombre, cl.apellido, cl.cedula, cl.latitud_casa, cl.longitud_casa, cl.direccion_casa
    `, clientesParams);

    return { eventos, clientes };
  }
}
