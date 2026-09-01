import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modelo } from './entities/modelo.entity';
import { CreateModeloDto, UpdateModeloDto } from './dto/create-modelo.dto';

@Injectable()
export class ModelosService {
  constructor(
    @InjectRepository(Modelo) private readonly repo: Repository<Modelo>,
  ) {}

  async findAll(filtros: { tipo?: string; tieneSerie?: boolean; activo?: boolean }): Promise<{ data: Modelo[]; total: number }> {
    const qb = this.repo.createQueryBuilder('m');
    if (filtros.tipo)       qb.andWhere('m.tipo = :tipo', { tipo: filtros.tipo });
    if (filtros.tieneSerie !== undefined) qb.andWhere('m.tieneSerie = :ts', { ts: filtros.tieneSerie });
    if (filtros.activo !== undefined)     qb.andWhere('m.activo = :a', { a: filtros.activo });
    qb.orderBy('m.nombre', 'ASC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<Modelo> {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException(`Modelo ${id} no encontrado`);
    return m;
  }

  async create(dto: CreateModeloDto): Promise<Modelo> {
    const exists = await this.repo.findOne({ where: { codigo: dto.codigo } });
    if (exists) throw new ConflictException(`Código de modelo '${dto.codigo}' ya existe`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateModeloDto): Promise<Modelo> {
    const modelo = await this.findOne(id);
    Object.assign(modelo, dto);
    return this.repo.save(modelo);
  }
}
