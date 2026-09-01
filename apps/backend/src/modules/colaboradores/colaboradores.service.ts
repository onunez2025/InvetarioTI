import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Colaborador } from './entities/colaborador.entity';
import { CreateColaboradorDto, UpdateColaboradorDto } from './dto/colaborador.dto';

@Injectable()
export class ColaboradoresService {
  constructor(
    @InjectRepository(Colaborador)
    private readonly repo: Repository<Colaborador>,
  ) {}

  findAll(busqueda?: string): Promise<Colaborador[]> {
    if (busqueda) {
      return this.repo.find({
        where: [
          { nombre: Like(`%${busqueda}%`) },
          { dni: Like(`%${busqueda}%`) },
          { departamento: Like(`%${busqueda}%`) },
        ],
        order: { nombre: 'ASC' },
      });
    }
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Colaborador> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Colaborador ${id} no encontrado`);
    return c;
  }

  create(dto: CreateColaboradorDto): Promise<Colaborador> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateColaboradorDto): Promise<Colaborador> {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    return this.repo.save(c);
  }

  async remove(id: number): Promise<void> {
    const c = await this.findOne(id);
    c.activo = false;
    await this.repo.save(c);
  }
}
