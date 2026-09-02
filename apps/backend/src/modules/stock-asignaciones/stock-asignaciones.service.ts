import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { StockAsignacion } from './entities/stock-asignacion.entity';
import { CreateStockAsignacionDto } from './dto/create-stock-asignacion.dto';
import { Modelo } from '../modelos/entities/modelo.entity';

@Injectable()
export class StockAsignacionesService {
  constructor(
    @InjectRepository(StockAsignacion)
    private readonly repo: Repository<StockAsignacion>,
    @InjectRepository(Modelo)
    private readonly modeloRepo: Repository<Modelo>,
  ) {}

  async findByColaborador(colaboradorId: number, soloActivas = false): Promise<StockAsignacion[]> {
    const where: any = { colaboradorId };
    if (soloActivas) where.fechaFin = IsNull();
    return this.repo.find({ where, order: { creadoEn: 'DESC' } });
  }

  async findByModelo(modeloId: number): Promise<StockAsignacion[]> {
    return this.repo.find({ where: { modeloId }, order: { creadoEn: 'DESC' } });
  }

  async calcularDisponible(
    modeloId: number,
  ): Promise<{ total: number; asignado: number; disponible: number }> {
    const { sum: asignado } = await this.repo
      .createQueryBuilder('sa')
      .select('SUM(sa.cantidad)', 'sum')
      .where('sa.modeloId = :id AND sa.fechaFin IS NULL', { id: modeloId })
      .getRawOne();

    return { total: 0, asignado: Number(asignado ?? 0), disponible: 0 };
  }

  async create(dto: CreateStockAsignacionDto, usuarioId: number): Promise<StockAsignacion> {
    const modelo = await this.modeloRepo.findOne({ where: { id: dto.modeloId } });
    if (!modelo) throw new NotFoundException(`Modelo ${dto.modeloId} no encontrado`);
    if (modelo.tieneSerie) {
      throw new BadRequestException('Este modelo es serializado — use el flujo de equipos para asignarlo');
    }

    const { asignado } = await this.calcularDisponible(dto.modeloId);

    const { sum: totalIngresado } = await this.repo.manager
      .createQueryBuilder()
      .select('SUM(cd.cantidad)', 'sum')
      .from('inventario_ti.compras_detalle', 'cd')
      .where('cd.modelo_id = :id', { id: dto.modeloId })
      .getRawOne();

    const total = Number(totalIngresado ?? 0);
    const disponible = total - asignado;
    if (dto.cantidad > disponible) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${disponible}, solicitado: ${dto.cantidad}`,
      );
    }

    return this.repo.save(this.repo.create({ ...dto, creadoPorId: usuarioId }));
  }

  async devolver(id: number, fechaFin: string): Promise<StockAsignacion> {
    const sa = await this.repo.findOne({ where: { id } });
    if (!sa) throw new NotFoundException(`StockAsignacion ${id} no encontrada`);
    if (sa.fechaFin) throw new BadRequestException('Este periférico ya fue devuelto');
    sa.fechaFin = fechaFin;
    return this.repo.save(sa);
  }
}
