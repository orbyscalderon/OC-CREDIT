import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { Ruta } from '../rutas/entities/ruta.entity';
import { BuroCreditoService } from '../buro-credito/buro-credito.service';
import { CrearClienteDto, ActualizarClienteDto } from './dto/cliente.dto';
import { ordenarPorCercania } from '../../common/utils/geo.util';
import { StorageService } from '../../common/services/storage.service';
import { normalizarDocumento } from '../../common/utils/normalizar-documento.util';

export interface PaginatedClientes {
  data: Cliente[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private readonly repo: Repository<Cliente>,
    @InjectRepository(Ruta) private readonly rutaRepo: Repository<Ruta>,
    private readonly buroCreditoService: BuroCreditoService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
  ) {}

  /** Rutas asignadas a un cobrador — usado para acotar su búsqueda a sus propios clientes. */
  async rutasDeCobrador(tenantId: string, cobradorId: string): Promise<string[]> {
    const rutas = await this.rutaRepo.find({
      where: { tenant_id: tenantId, cobrador_id: cobradorId },
      select: ['id'],
    });
    return rutas.map((r) => r.id);
  }

  async crear(tenantId: string, dto: CrearClienteDto): Promise<Cliente> {
    // Normalizada (sin guiones/espacios) -- si no, "001-1234567-8" y
    // "0011234567 8" pasan como cédulas distintas: se cuela el duplicado
    // aquí y, peor, el buró cross-tenant nunca las hace matchear.
    const cedula = dto.cedula ? normalizarDocumento(dto.cedula) : dto.cedula;

    if (cedula) {
      const existe = await this.repo.findOne({
        where: { tenant_id: tenantId, cedula },
      });
      if (existe) throw new BadRequestException('Ya existe un cliente con esa cédula en esta agencia');
    }

    return this.repo.save(
      this.repo.create({ ...dto, cedula, tenant_id: tenantId }),
    );
  }

  /**
   * rutaIds: si se pasa (cobrador buscando desde el panel web), acota la
   * búsqueda a clientes de sus propias rutas. undefined = sin restricción
   * (admin/supervisor, que ven toda la cartera del tenant).
   */
  async buscarConBuro(
    tenantId: string,
    busqueda: string,
    rutaIds?: string[],
  ) {
    if (rutaIds && rutaIds.length === 0) return []; // cobrador sin rutas asignadas

    const qb = this.repo.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      // ver comentario equivalente en listar(): nombre/apellido/cedula por
      // separado no matchea "Nombre Apellido" completo, se agrega concatenado.
      .andWhere(
        `(c.nombre ILIKE :b OR c.apellido ILIKE :b OR c.cedula ILIKE :b OR (c.nombre || ' ' || c.apellido) ILIKE :b)`,
        { b: `%${busqueda}%` },
      )
      .take(20);

    if (rutaIds) {
      qb.andWhere('c.ruta_id IN (:...rutaIds)', { rutaIds });
    }

    return qb.getMany();
  }

  /** Consulta buró antes de registrar un cliente nuevo */
  async consultarBuroPreventivo(cedula: string, tenantId: string) {
    if (!cedula) return null;
    return this.buscarConBuro(tenantId, cedula);
  }

  async obtenerPorRuta(tenantId: string, rutaId: string): Promise<Cliente[]> {
    return this.repo.find({
      where: { tenant_id: tenantId, ruta_id: rutaId, activo: true },
      order: { orden_visita: 'ASC', apellido: 'ASC' },
    });
  }

  async obtener(tenantId: string, id: string): Promise<Cliente> {
    const c = await this.repo.findOne({ where: { id, tenant_id: tenantId } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async actualizar(tenantId: string, id: string, dto: ActualizarClienteDto): Promise<Cliente> {
    const cliente = await this.obtener(tenantId, id);
    Object.assign(cliente, dto);
    if (dto.cedula) cliente.cedula = normalizarDocumento(dto.cedula);
    return this.repo.save(cliente);
  }

  async subirFotosCedula(
    tenantId: string,
    clienteId: string,
    frontal?: { buffer: Buffer; mimetype: string },
    trasera?: { buffer: Buffer; mimetype: string },
  ): Promise<Cliente> {
    const cliente = await this.obtener(tenantId, clienteId);
    if (frontal) {
      const ext = frontal.mimetype.split('/')[1] || 'jpg';
      const objectPath = `cedulas/${clienteId}/frontal.${ext}`;
      await this.storageService.subir(objectPath, frontal.buffer, frontal.mimetype);
      cliente.foto_cedula_frontal_url = objectPath;
    }
    if (trasera) {
      const ext = trasera.mimetype.split('/')[1] || 'jpg';
      const objectPath = `cedulas/${clienteId}/trasera.${ext}`;
      await this.storageService.subir(objectPath, trasera.buffer, trasera.mimetype);
      cliente.foto_cedula_trasera_url = objectPath;
    }
    return this.repo.save(cliente);
  }

  async urlFotoCedula(tenantId: string, clienteId: string, lado: 'frontal' | 'trasera'): Promise<string> {
    const cliente = await this.obtener(tenantId, clienteId);
    const objectPath = lado === 'frontal' ? cliente.foto_cedula_frontal_url : cliente.foto_cedula_trasera_url;
    if (!objectPath) throw new NotFoundException('Imagen no disponible');
    return this.storageService.urlFirmada(objectPath);
  }

  async reasignarRuta(tenantId: string, clienteId: string, nuevaRutaId: string): Promise<void> {
    const c = await this.obtener(tenantId, clienteId);
    c.ruta_id = nuevaRutaId;
    // El orden de visita es específico de cada ruta: al mover el cliente se
    // reinicia para que no colisione con el orden ya definido en la ruta
    // destino. Queda al final (orden_visita null) hasta que se reordene.
    c.orden_visita = null;
    await this.repo.save(c);
  }

  /** Guarda el orden de visita completo de una ruta de una sola vez (drag-and-drop en el panel). */
  async reordenar(tenantId: string, rutaId: string, orden: string[]): Promise<Cliente[]> {
    const clientesRuta = await this.repo.find({
      where: { tenant_id: tenantId, ruta_id: rutaId },
      select: ['id'],
    });
    const idsValidos = new Set(clientesRuta.map((c) => c.id));
    const idsInvalidos = orden.filter((id) => !idsValidos.has(id));
    if (idsInvalidos.length > 0) {
      throw new BadRequestException('Uno o más clientes no pertenecen a esta ruta');
    }

    await this.dataSource.transaction(async (manager) => {
      await Promise.all(
        orden.map((id, index) =>
          manager.update(Cliente, { id, tenant_id: tenantId }, { orden_visita: index }),
        ),
      );
    });

    return this.obtenerPorRuta(tenantId, rutaId);
  }

  /** Reordena automáticamente los clientes de una ruta por cercanía geográfica (vecino más cercano). */
  async ordenarAutomatico(tenantId: string, rutaId: string): Promise<Cliente[]> {
    const clientes = await this.obtenerPorRuta(tenantId, rutaId);
    const ordenados = ordenarPorCercania(
      clientes.map((c) => ({ id: c.id, lat: c.latitud_casa, lng: c.longitud_casa })),
    );
    return this.reordenar(tenantId, rutaId, ordenados.map((p) => p.id));
  }

  async listar(tenantId: string, page = 1, limit = 30, q?: string): Promise<PaginatedClientes> {
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (q && q.trim()) {
      // nombre/apellido/cedula por separado NO alcanza para "Nombre Apellido"
      // completo (ninguna columna sola contiene la frase) -- se agrega el
      // nombre completo concatenado para que buscar "Juan Pérez" encuentre
      // al cliente aunque nombre='Juan' y apellido='Pérez' esten separados.
      qb.andWhere(
        `(c.nombre ILIKE :q OR c.apellido ILIKE :q OR c.cedula ILIKE :q OR (c.nombre || ' ' || c.apellido) ILIKE :q)`,
        { q: `%${q.trim()}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('c.apellido', 'ASC')
      .addOrderBy('c.nombre', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }
}
