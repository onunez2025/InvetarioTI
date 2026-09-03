import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  private async generarTokens(usuario: Usuario) {
    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    const rawToken = crypto.randomBytes(64).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.rtRepo.save({ usuarioId: usuario.id, tokenHash: hash, expiresAt, revoked: false });

    return {
      token: accessToken,
      access_token: accessToken,
      refresh_token: rawToken,
      expires_in: 28800,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async login(email: string, password: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { email, activo: true } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) throw new UnauthorizedException('Credenciales inválidas');

    await this.usuarioRepo.save({ ...usuario, ultimoLogin: new Date() });

    return this.generarTokens(usuario);
  }

  async refresh(rawToken: string) {
    if (!rawToken) throw new UnauthorizedException('Refresh token requerido');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const rt = await this.rtRepo.findOne({ where: { tokenHash: hash, revoked: false } });
    if (!rt || rt.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    // Rotar — revocar el actual
    await this.rtRepo.update(rt.id, { revoked: true });
    // Cargar usuario
    const usuario = await this.usuarioRepo.findOne({ where: { id: rt.usuarioId, activo: true } });
    if (!usuario) throw new UnauthorizedException('Usuario inactivo o no encontrado');
    return this.generarTokens(usuario);
  }

  async logout(usuarioId: number) {
    await this.rtRepo.update({ usuarioId, revoked: false }, { revoked: true });
    return { message: 'Sesión cerrada' };
  }

  async validarUsuario(id: number): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { id, activo: true } });
  }
}
