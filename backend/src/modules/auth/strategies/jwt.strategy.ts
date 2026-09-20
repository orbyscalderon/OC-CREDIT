import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { msg } from '../../../common/i18n/messages';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Cookie HttpOnly (navegador web)
        (req: Request) => req?.cookies?.['oc_token'] ?? null,
        // Authorization: Bearer (apps móviles / API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, activo: true },
    });

    if (!usuario) throw new UnauthorizedException(msg('auth_usuario_inactivo_no_encontrado'));

    if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
      throw new UnauthorizedException(msg('auth_cuenta_temporalmente_bloqueada'));
    }

    return payload;
  }
}
