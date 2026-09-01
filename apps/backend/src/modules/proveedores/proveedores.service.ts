import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';
import { CreateProveedorDto, UpdateProveedorDto } from './dto/create-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor) private readonly repo: Repository<Proveedor>,
  ) {}

  async findAll(): Promise<Proveedor[]> {
    return this.repo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<Proveedor> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return p;
  }

  async create(dto: CreateProveedorDto): Promise<Proveedor> {
    if (dto.ruc) {
      const exists = await this.repo.findOne({ where: { ruc: dto.ruc } });
      if (exists) throw new ConflictException(`RUC '${dto.ruc}' ya existe`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, dto);
    return this.repo.save(proveedor);
  }
}
