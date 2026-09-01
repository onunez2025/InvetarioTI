import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Asignacion } from './entities/asignacion.entity';
import { CreateAsignacionDto, DevolucionDto } from './dto/asignacion.dto';

@Injectable()
export class AsignacionesService {
  constructor(
    @InjectRepository(Asignacion)
    private readonly repo: Repository<Asignacion>,
  ) {}

  /** Todas las asignaciones activas (fecha_fin IS NULL) */
  findActivas(): Promise<Asignacion[]> {
    return this.repo.find({
      where: { fechaFin: IsNull() },
      order: { creadoEn: 'DESC' },
    });
  }

  /** Historial completo (con fecha_fin) — paginado */
  async findHistorial(page = 1, limit = 50): Promise<{ data: Asignacion[]; total: number }> {
    const [data, total] = await this.repo.findAndCount({
      where: { fechaFin: Not(IsNull()) },
      order: { fechaFin: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  /** Asignaciones de un equipo (activas e historial) */
  findByEquipo(equipoId: number): Promise<Asignacion[]> {
    return this.repo.find({
      where: { equipoId },
      order: { fechaInicio: 'DESC' },
    });
  }

  /** Asignación activa de un equipo (null si libre) */
  findActivaByEquipo(equipoId: number): Promise<Asignacion | null> {
    return this.repo.findOne({ where: { equipoId, fechaFin: IsNull() } });
  }

  /** Asignaciones activas de un colaborador */
  findByColaborador(colaboradorId: number): Promise<Asignacion[]> {
    return this.repo.find({
      where: { colaboradorId, fechaFin: IsNull() },
      order: { fechaInicio: 'DESC' },
    });
  }

  /** Todas las asignaciones de un colaborador (activas + historial) */
  findHistorialByColaborador(colaboradorId: number): Promise<Asignacion[]> {
    return this.repo.find({
      where: { colaboradorId },
      order: { fechaInicio: 'DESC' },
    });
  }

  /** Crear nueva asignación. Si el equipo ya tenía una activa, la cierra primero. */
  async create(dto: CreateAsignacionDto, usuarioId: number): Promise<Asignacion> {
    // Cerrar asignación activa anterior (si existe)
    const activa = await this.findActivaByEquipo(dto.equipoId);
    if (activa) {
      activa.fechaFin = dto.fechaInicio; // cierra el mismo día que empieza la nueva
      await this.repo.save(activa);
    }

    const nueva = this.repo.create({
      equipoId: dto.equipoId,
      colaboradorId: dto.colaboradorId,
      fechaInicio: dto.fechaInicio,
      fechaFin: null,
      observaciones: dto.observaciones,
      creadoPorId: usuarioId,
    });
    return this.repo.save(nueva);
  }

  /** Registrar devolución de un equipo (cerrar asignación activa) */
  async devolver(id: number, dto: DevolucionDto): Promise<Asignacion> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Asignación ${id} no encontrada`);
    if (a.fechaFin) throw new BadRequestException('Esta asignación ya fue cerrada');
    a.fechaFin = dto.fechaFin;
    if (dto.observaciones) a.observaciones = dto.observaciones;
    return this.repo.save(a);
  }

  /** Eliminar asignación (solo si no tiene equipo dañado o similar — soft via fechaFin) */
  async remove(id: number): Promise<void> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException(`Asignación ${id} no encontrada`);
    await this.repo.remove(a);
  }
}
