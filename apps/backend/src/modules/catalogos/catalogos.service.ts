import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Catalogo } from './entities/catalogo.entity';
import { CreateCatalogoDto, UpdateCatalogoDto } from './dto/catalogo.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Catalogo)
    private readonly repo: Repository<Catalogo>,
  ) {}

  /** Todos los catálogos agrupados (para cargar en un solo request desde el frontend) */
  async findAll(): Promise<Record<string, Catalogo[]>> {
    const items = await this.repo.find({ order: { tipo: 'ASC', nombre: 'ASC' } });
    return items.reduce<Record<string, Catalogo[]>>((acc, c) => {
      if (!acc[c.tipo]) acc[c.tipo] = [];
      acc[c.tipo].push(c);
      return acc;
    }, {});
  }

  /** Solo activos de un tipo — usado por el formulario de equipos.
   *  Si se pasa parentId, filtra solo los hijos de ese padre. */
  findByTipo(tipo: string, parentId?: number): Promise<Catalogo[]> {
    const where: Record<string, unknown> = { tipo, activo: true };
    if (parentId !== undefined) where.parentId = parentId;
    return this.repo.find({ where: where as any, order: { nombre: 'ASC' } });
  }

  /** Lista completa de un tipo (incluye inactivos) — usado en Configuración */
  findAllByTipo(tipo: string): Promise<Catalogo[]> {
    return this.repo.find({
      where: { tipo },
      order: { nombre: 'ASC' },
    });
  }

  async create(dto: CreateCatalogoDto): Promise<Catalogo> {
    const nombre = dto.nombre.trim().toUpperCase();
    const existe = await this.repo.findOne({ where: { tipo: dto.tipo, nombre } });
    if (existe) throw new ConflictException(`Ya existe "${nombre}" en ${dto.tipo}`);
    const item = this.repo.create({ ...dto, nombre });
    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateCatalogoDto): Promise<Catalogo> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Catálogo ${id} no encontrado`);
    if (dto.nombre) dto.nombre = dto.nombre.trim().toUpperCase();
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Catálogo ${id} no encontrado`);
    await this.repo.delete(id);
  }
}
