import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { HistorialCambio } from '../auditoria/entities/historial-cambio.entity';

export interface FiltroHistorial {
  equipoId?: number;
  usuarioId?: number;
  campo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(HistorialCambio)
    private readonly repo: Repository<HistorialCambio>,
  ) {}

  async findAll(filtros: FiltroHistorial): Promise<{ data: HistorialCambio[]; total: number }> {
    const { page = 1, limit = 50, equipoId, usuarioId, campo, fechaDesde, fechaHasta } = filtros;

    const where: FindOptionsWhere<HistorialCambio> = {};

    if (equipoId) where.equipo = { id: equipoId };
    if (usuarioId) where.usuario = { id: usuarioId };
    if (campo) where.campo = campo;
    if (fechaDesde && fechaHasta) {
      where.fecha = Between(new Date(fechaDesde), new Date(fechaHasta + 'T23:59:59'));
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { equipo: true, usuario: true },
      order: { fecha: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }
}
