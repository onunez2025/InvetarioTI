import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto, UpdateUsuarioDto, CambiarPasswordDto } from './dto/usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  /** Devuelve todos los usuarios sin el campo passwordHash */
  async findAll(): Promise<Omit<Usuario, 'passwordHash'>[]> {
    const usuarios = await this.repo.find({ order: { nombre: 'ASC' } });
    return usuarios.map(({ passwordHash: _pw, ...rest }) => rest as Omit<Usuario, 'passwordHash'>);
  }

  async findOne(id: number): Promise<Omit<Usuario, 'passwordHash'>> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    const { passwordHash: _pw, ...rest } = u;
    return rest as Omit<Usuario, 'passwordHash'>;
  }

  async create(dto: CreateUsuarioDto): Promise<Omit<Usuario, 'passwordHash'>> {
    const existe = await this.repo.findOne({ where: { email: dto.email } });
    if (existe) throw new ConflictException(`El email ${dto.email} ya está en uso`);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = this.repo.create({
      nombre: dto.nombre,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      rol: dto.rol as any,
      departamento: dto.departamento,
      activo: true,
    });
    const saved = await this.repo.save(usuario);
    const { passwordHash: _pw, ...rest } = saved;
    return rest as Omit<Usuario, 'passwordHash'>;
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Omit<Usuario, 'passwordHash'>> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    Object.assign(u, dto);
    const saved = await this.repo.save(u);
    const { passwordHash: _pw, ...rest } = saved;
    return rest as Omit<Usuario, 'passwordHash'>;
  }

  async cambiarPassword(id: number, dto: CambiarPasswordDto, solicitanteId: number, solicitanteRol: string): Promise<void> {
    if (solicitanteRol !== 'ADMIN' && solicitanteId !== id) {
      throw new ForbiddenException('Solo puedes cambiar tu propia contraseña');
    }
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    u.passwordHash = await bcrypt.hash(dto.password, 10);
    await this.repo.save(u);
  }

  async deactivate(id: number): Promise<void> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`Usuario ${id} no encontrado`);
    u.activo = false;
    await this.repo.save(u);
  }
}
