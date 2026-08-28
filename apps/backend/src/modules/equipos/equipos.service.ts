import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Equipo } from './entities/equipo.entity';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { FiltroEquiposDto } from './dto/filtro-equipos.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class EquiposService {
  constructor(
    @InjectRepository(Equipo)
    private readonly equipoRepo: Repository<Equipo>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(
    filtros: Omit<FiltroEquiposDto, 'page' | 'limit'>,
    page = 1,
    limit = 50,
  ): Promise<{ data: Equipo[]; total: number }> {
    const where: FindOptionsWhere<Equipo> = {};
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.departamento) where.departamento = filtros.departamento;
    if (filtros.ubicacion) where.ubicacion = filtros.ubicacion;
    if (filtros.estado) where.estado = filtros.estado as any;
    if (filtros.busqueda) where.nombre = Like(`%${filtros.busqueda}%`);

    const [data, total] = await this.equipoRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { nombre: 'ASC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Equipo> {
    const equipo = await this.equipoRepo.findOne({ where: { id } });
    if (!equipo) throw new NotFoundException(`Equipo con id ${id} no encontrado`);
    return equipo;
  }

  async create(dto: CreateEquipoDto, usuarioId: number): Promise<Equipo> {
    const equipo = this.equipoRepo.create();
    Object.assign(equipo, dto, { creadoPor: { id: usuarioId } });
    return this.equipoRepo.save(equipo);
  }

  async update(id: number, dto: UpdateEquipoDto, usuarioId: number): Promise<Equipo> {
    const equipoAnterior = await this.findOne(id);
    const copiaAnterior = { ...equipoAnterior };
    Object.assign(equipoAnterior, dto);
    const equipoActualizado = await this.equipoRepo.save(equipoAnterior);
    await this.auditoriaService.registrarCambios(id, copiaAnterior as Equipo, equipoActualizado, usuarioId);
    return equipoActualizado;
  }

  async remove(id: number): Promise<void> {
    const equipo = await this.findOne(id);
    equipo.estado = 'BAJA';
    await this.equipoRepo.save(equipo);
  }
}
