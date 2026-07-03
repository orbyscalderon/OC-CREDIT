import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, MinLength,
} from 'class-validator';
import { Usuario } from './entities/usuario.entity';
import { Empleado } from './entities/empleado.entity';
import { Rol } from '../../common/constants/roles.enum';

/* ── DTOs ───────────────────────────────────────────────────────────────── */

export class CrearEmpleadoDto {
  @IsString() @IsNotEmpty() @Length(1, 100)
  nombre: string;

  @IsString() @IsNotEmpty() @Length(1, 100)
  apellido: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsEnum([Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT])
  rol: Rol;

  @IsOptional() @IsString() @Length(0, 20)
  cedula?: string;

  @IsOptional() @IsString() @Length(0, 30)
  telefono?: string;
}

export class ToggleActivoDto {
  activo: boolean;
}

/* ── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Empleado) private readonly empleadoRepo: Repository<Empleado>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(tenantId: string) {
    const empleados = await this.empleadoRepo.find({
      where: { tenant_id: tenantId },
      relations: ['usuario'],
      order: { nombre: 'ASC' },
    });
    return empleados.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      apellido: e.apellido,
      cedula: e.cedula,
      telefono: e.telefono,
      activo: e.activo,
      usuario_id: e.usuario_id,
      email: e.usuario?.email,
      rol: e.usuario?.rol,
      ultimo_acceso: e.usuario?.ultimo_acceso,
    }));
  }

  async crear(tenantId: string, dto: CrearEmpleadoDto) {
    const existeEmail = await this.usuarioRepo.findOne({
      where: { tenant_id: tenantId, email: dto.email },
    });
    if (existeEmail) throw new ConflictException('Ya existe un usuario con ese email');

    if (dto.cedula) {
      const existeCedula = await this.empleadoRepo.findOne({
        where: { tenant_id: tenantId, cedula: dto.cedula },
      });
      if (existeCedula) throw new ConflictException('Ya existe un empleado con esa cédula');
    }

    const password_hash = await bcrypt.hash(dto.password, 12);

    return this.dataSource.transaction(async (em) => {
      const usuario = em.create(Usuario, {
        tenant_id: tenantId,
        email: dto.email,
        password_hash,
        rol: dto.rol,
        activo: true,
      });
      await em.save(usuario);

      const empleado = em.create(Empleado, {
        tenant_id: tenantId,
        usuario_id: usuario.id,
        nombre: dto.nombre,
        apellido: dto.apellido,
        cedula: dto.cedula,
        telefono: dto.telefono,
        activo: true,
      });
      await em.save(empleado);

      return {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email: usuario.email,
        rol: usuario.rol,
        cedula: empleado.cedula,
        telefono: empleado.telefono,
        activo: empleado.activo,
      };
    });
  }

  async toggleActivo(tenantId: string, empleadoId: string, activo: boolean) {
    const empleado = await this.empleadoRepo.findOne({
      where: { id: empleadoId, tenant_id: tenantId },
      relations: ['usuario'],
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');

    empleado.activo = activo;
    empleado.usuario.activo = activo;

    await this.dataSource.transaction(async (em) => {
      await em.save(Empleado, empleado);
      await em.save(Usuario, empleado.usuario);
    });

    return { id: empleadoId, activo };
  }

  async resetPassword(tenantId: string, empleadoId: string, nuevaPassword: string) {
    const empleado = await this.empleadoRepo.findOne({
      where: { id: empleadoId, tenant_id: tenantId },
      relations: ['usuario'],
    });
    if (!empleado) throw new NotFoundException('Empleado no encontrado');
    if (nuevaPassword.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');

    empleado.usuario.password_hash = await bcrypt.hash(nuevaPassword, 12);
    await this.usuarioRepo.save(empleado.usuario);

    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}
