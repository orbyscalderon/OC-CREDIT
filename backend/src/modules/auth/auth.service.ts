import {
  BadRequestException, Injectable, NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Empleado } from '../usuarios/entities/empleado.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Empleado) private readonly empleadoRepo: Repository<Empleado>,
    @InjectRepository(TenantSettings) private readonly settingsRepo: Repository<TenantSettings>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Mismo error y mismo status (401) si el email no existe o si la
    // contraseña es incorrecta — un status distinto (404 vs 401) permitiría
    // enumerar qué emails están registrados probando uno por uno.
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Credenciales inválidas');

    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw new UnauthorizedException(
        `Cuenta bloqueada hasta ${usuario.bloqueado_hasta.toISOString()}`,
      );
    }

    const passwordOk = await bcrypt.compare(dto.password, usuario.password_hash);

    if (!passwordOk) {
      const intentos = usuario.intentos_fallidos + 1;
      const actualizacion: Partial<Usuario> = { intentos_fallidos: intentos };
      if (intentos >= 5) {
        actualizacion.bloqueado_hasta = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }
      await this.usuarioRepo.update(usuario.id, actualizacion);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Reset intentos fallidos y registrar acceso
    await this.usuarioRepo.update(usuario.id, {
      intentos_fallidos: 0,
      ultimo_acceso: new Date(),
      bloqueado_hasta: null,
    });

    const empleado = await this.empleadoRepo.findOne({
      where: { usuario_id: usuario.id },
    });
    if (!empleado) throw new NotFoundException('Perfil de empleado no encontrado');

    const tenant = await this.tenantRepo.findOne({ where: { id: usuario.tenant_id } });
    if (!tenant || !tenant.activo) throw new UnauthorizedException('Empresa inactiva');

    const settings = await this.settingsRepo.findOne({
      where: { tenant_id: usuario.tenant_id },
    });

    const payload = {
      sub: usuario.id,
      tenantId: usuario.tenant_id,
      empleadoId: empleado.id,
      rol: usuario.rol,
      email: usuario.email,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRATION', '8h'),
    });

    return {
      access_token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        empleado_id: empleado.id,
      },
      tenant_config: {
        tenant_id: tenant.id,
        nombre_empresa: tenant.nombre_empresa,
        url_logo: settings?.url_logo ?? null,
        color_primario: settings?.color_primario ?? '#1976D2',
        color_secundario: settings?.color_secundario ?? '#424242',
        color_acento: settings?.color_acento ?? '#FF6F00',
        moneda: settings?.moneda ?? 'DOP',
        simbolo_moneda: settings?.simbolo_moneda ?? 'RD$',
        zona_horaria: settings?.zona_horaria ?? 'America/Santo_Domingo',
        formato_fecha: settings?.formato_fecha ?? 'DD/MM/YYYY',
      },
    };
  }

  async loginWithGoogle(idToken: string): Promise<LoginResponseDto> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new UnauthorizedException('Google login no está configurado en este servidor');

    const client = new OAuth2Client(clientId);
    let email: string;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload();
      email = (payload?.email ?? '').toLowerCase().trim();
      if (!email) throw new Error('no email');
    } catch {
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    const usuario = await this.usuarioRepo.findOne({ where: { email } });
    if (!usuario) {
      throw new UnauthorizedException(
        'No existe una cuenta activa con ese email de Google. Regístrate primero seleccionando un plan.',
      );
    }
    if (!usuario.activo) throw new UnauthorizedException('Cuenta inactiva');

    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw new UnauthorizedException(`Cuenta bloqueada hasta ${usuario.bloqueado_hasta.toISOString()}`);
    }

    await this.usuarioRepo.update(usuario.id, {
      intentos_fallidos: 0,
      ultimo_acceso: new Date(),
      bloqueado_hasta: null,
    });

    const empleado = await this.empleadoRepo.findOne({ where: { usuario_id: usuario.id } });
    if (!empleado) throw new NotFoundException('Perfil de empleado no encontrado');

    const tenant = await this.tenantRepo.findOne({ where: { id: usuario.tenant_id } });
    if (!tenant || !tenant.activo) throw new UnauthorizedException('Empresa inactiva');

    const settings = await this.settingsRepo.findOne({ where: { tenant_id: usuario.tenant_id } });

    const jwtPayload = {
      sub: usuario.id,
      tenantId: usuario.tenant_id,
      empleadoId: empleado.id,
      rol: usuario.rol,
      email: usuario.email,
    };

    const access_token = await this.jwtService.signAsync(jwtPayload, {
      expiresIn: this.config.get('JWT_EXPIRATION', '8h'),
    });

    return {
      access_token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        empleado_id: empleado.id,
      },
      tenant_config: {
        tenant_id: tenant.id,
        nombre_empresa: tenant.nombre_empresa,
        url_logo: settings?.url_logo ?? null,
        color_primario: settings?.color_primario ?? '#1976D2',
        color_secundario: settings?.color_secundario ?? '#424242',
        color_acento: settings?.color_acento ?? '#FF6F00',
        moneda: settings?.moneda ?? 'DOP',
        simbolo_moneda: settings?.simbolo_moneda ?? 'RD$',
        zona_horaria: settings?.zona_horaria ?? 'America/Santo_Domingo',
        formato_fecha: settings?.formato_fecha ?? 'DD/MM/YYYY',
      },
    };
  }

  async getMe(usuarioId: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario || !usuario.activo) throw new UnauthorizedException('Sesión inválida');

    const empleado = await this.empleadoRepo.findOne({ where: { usuario_id: usuarioId } });
    const tenant = await this.tenantRepo.findOne({ where: { id: usuario.tenant_id } });
    if (!tenant || !tenant.activo) throw new UnauthorizedException('Empresa inactiva');

    const settings = await this.settingsRepo.findOne({ where: { tenant_id: usuario.tenant_id } });

    return {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: empleado?.nombre ?? '',
        apellido: empleado?.apellido ?? '',
        empleado_id: empleado?.id ?? '',
      },
      tenant_config: {
        tenant_id: tenant.id,
        nombre_empresa: tenant.nombre_empresa,
        url_logo: settings?.url_logo ?? null,
        color_primario: settings?.color_primario ?? '#1976D2',
        color_secundario: settings?.color_secundario ?? '#424242',
        color_acento: settings?.color_acento ?? '#FF6F00',
        moneda: settings?.moneda ?? 'DOP',
        simbolo_moneda: settings?.simbolo_moneda ?? 'RD$',
        zona_horaria: settings?.zona_horaria ?? 'America/Santo_Domingo',
        formato_fecha: settings?.formato_fecha ?? 'DD/MM/YYYY',
      },
    };
  }

  async cambiarPassword(usuarioId: string, passwordActual: string, nuevaPassword: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const ok = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!ok) throw new BadRequestException('La contraseña actual es incorrecta');

    if (nuevaPassword.length < 8) throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres');

    usuario.password_hash = await bcrypt.hash(nuevaPassword, 12);
    await this.usuarioRepo.save(usuario);
    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  async logout(usuarioId: string): Promise<void> {
    await this.usuarioRepo.update(usuarioId, { token_refresh: null });
  }
}
