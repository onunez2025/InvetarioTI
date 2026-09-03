import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { Colaborador } from './entities/colaborador.entity';
import { CreateColaboradorDto, UpdateColaboradorDto } from './dto/colaborador.dto';

@Injectable()
export class ColaboradoresService {
  constructor(
    @InjectRepository(Colaborador)
    private readonly repo: Repository<Colaborador>,
    private readonly dataSource: DataSource,
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

  async update(id: number, dto: UpdateColaboradorDto): Promise<any> {
    const colaborador = await this.findOne(id);
    let offboarding: { equiposPendientes: number; perifericosPendientes: number } | undefined;

    if (dto.activo === false && colaborador.activo === true) {
      const equRow = await this.dataSource.query(
        `
        SELECT COUNT(*) AS total FROM inventario_ti.asignaciones
        WHERE colaborador_id = @0 AND fecha_fin IS NULL
      `,
        [id],
      );
      const perRow = await this.dataSource.query(
        `
        SELECT COUNT(*) AS total FROM inventario_ti.stock_asignaciones
        WHERE colaborador_id = @0 AND fecha_fin IS NULL
      `,
        [id],
      );
      offboarding = {
        equiposPendientes: parseInt(equRow[0]?.total ?? '0', 10),
        perifericosPendientes: parseInt(perRow[0]?.total ?? '0', 10),
      };
    }

    Object.assign(colaborador, dto);
    const updated = await this.repo.save(colaborador);
    return { ...updated, _offboarding: offboarding };
  }

  async remove(id: number): Promise<any> {
    const colaborador = await this.findOne(id);
    const equRow = await this.dataSource.query(
      `
      SELECT COUNT(*) AS total FROM inventario_ti.asignaciones
      WHERE colaborador_id = @0 AND fecha_fin IS NULL
    `,
      [id],
    );
    const perRow = await this.dataSource.query(
      `
      SELECT COUNT(*) AS total FROM inventario_ti.stock_asignaciones
      WHERE colaborador_id = @0 AND fecha_fin IS NULL
    `,
      [id],
    );
    const offboarding = {
      equiposPendientes: parseInt(equRow[0]?.total ?? '0', 10),
      perifericosPendientes: parseInt(perRow[0]?.total ?? '0', 10),
    };

    colaborador.activo = false;
    const updated = await this.repo.save(colaborador);
    return { ...updated, _offboarding: offboarding };
  }
}
