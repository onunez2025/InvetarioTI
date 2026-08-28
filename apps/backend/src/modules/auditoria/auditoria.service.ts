import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialCambio } from './entities/historial-cambio.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

const CAMPOS_AUDITADOS: (keyof Equipo)[] = [
  'nombre', 'empresa', 'gerencia', 'departamento', 'ubicacion',
  'tipo', 'marca', 'modelo', 'serie', 'firmware', 'version',
  'endOfSale', 'endOfSupport', 'estado', 'codigo', 'ceco',
];

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(HistorialCambio)
    private readonly historialRepo: Repository<HistorialCambio>,
  ) {}

  async registrarCambios(
    equipoId: number,
    anterior: Equipo,
    nuevo: Equipo,
    usuarioId: number,
  ): Promise<void> {
    const cambios: Partial<HistorialCambio>[] = [];

    for (const campo of CAMPOS_AUDITADOS) {
      const valorAnterior = String(anterior[campo] ?? '');
      const valorNuevo = String(nuevo[campo] ?? '');
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          equipo: { id: equipoId } as Equipo,
          campo,
          valorAnterior,
          valorNuevo,
          usuario: { id: usuarioId } as any,
        });
      }
    }

    if (cambios.length > 0) {
      await this.historialRepo.save(cambios);
    }
  }

  async findByEquipo(equipoId: number): Promise<HistorialCambio[]> {
    return this.historialRepo.find({
      where: { equipo: { id: equipoId } },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }
}
