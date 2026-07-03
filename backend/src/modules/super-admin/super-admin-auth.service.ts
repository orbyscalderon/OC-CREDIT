import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SuperAdmin } from './entities/super-admin.entity';

export interface SuperAdminJwtPayload {
  sub: string;
  email: string;
  type: 'super_admin';
}

@Injectable()
export class SuperAdminAuthService {
  constructor(
    @InjectRepository(SuperAdmin) private readonly repo: Repository<SuperAdmin>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string; nombre: string; email: string }> {
    const admin = await this.repo.findOne({ where: { email: email.toLowerCase().trim() } });

    // Mismo error y status si el email no existe o si la contraseña es
    // incorrecta — evita enumerar cuentas de super-admin (mismo criterio
    // aplicado en auth.service.ts para el login de tenants).
    if (!admin || !admin.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(password, admin.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.repo.update(admin.id, { ultimo_acceso: new Date() });

    const payload: SuperAdminJwtPayload = { sub: admin.id, email: admin.email, type: 'super_admin' };
    const secret = this.config.get<string>('SUPER_ADMIN_JWT_SECRET');
    const access_token = await this.jwtService.signAsync(payload, { secret, expiresIn: '8h' });

    return { access_token, nombre: admin.nombre, email: admin.email };
  }
}
