import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
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

  async createBulk(
    dto: {
      modeloId: number;
      cantidad: number;
      fechaInicio: string;
      colaboradorIds: number[];
      observaciones?: string;
    },
    usuarioId: number,
  ) {
    if (!dto.colaboradorIds || dto.colaboradorIds.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un colaborador');
    }
    if (dto.colaboradorIds.length > 50) {
      throw new BadRequestException('Máximo 50 colaboradores por asignación masiva');
    }

    const modelo = await this.modeloRepo.findOne({ where: { id: dto.modeloId } });
    if (!modelo) throw new NotFoundException('Modelo no encontrado');
    if (modelo.tieneSerie) {
      throw new BadRequestException('Este modelo es serializado — use asignación individual de equipos');
    }

    const [stockRow] = await this.dataSource.query(
      `
      SELECT ISNULL(SUM(cd.cantidad), 0) -
             ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                     WHERE sa.modelo_id = @0 AND sa.fecha_fin IS NULL), 0) AS disponible
      FROM inventario_ti.compras_detalle cd WHERE cd.modelo_id = @0
    `,
      [dto.modeloId],
    );
    const disponible = parseInt(stockRow?.disponible ?? '0', 10);
    const necesario = dto.cantidad * dto.colaboradorIds.length;
    if (disponible < necesario) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${disponible}, necesario: ${necesario}`,
      );
    }

    const registros = dto.colaboradorIds.map((cid) =>
      this.repo.create({
        modeloId: dto.modeloId,
        colaboradorId: cid,
        cantidad: dto.cantidad,
        fechaInicio: dto.fechaInicio,
        observaciones: dto.observaciones,
        creadoPorId: usuarioId,
      }),
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.save(registros);
    });

    return { creados: registros.length, modeloId: dto.modeloId };
  }

  async getActivasAgrupadas() {
    const rows = await this.dataSource.query(`
      SELECT c.id AS colaborador_id, c.nombre AS colaborador,
             c.gerencia, c.departamento,
             sa.id AS asignacionId, sa.modelo_id AS modeloId,
             m.nombre AS modeloNombre, m.tipo, m.codigo AS modeloCodigo,
             sa.cantidad, sa.fecha_inicio AS fechaInicio
      FROM inventario_ti.stock_asignaciones sa
      JOIN inventario_ti.colaboradores c ON c.id=sa.colaborador_id
      JOIN inventario_ti.modelos m ON m.id=sa.modelo_id
      WHERE sa.fecha_fin IS NULL
      ORDER BY c.nombre, sa.fecha_inicio
    `);

    // Agrupar en memoria por colaborador_id
    const map = new Map<number, any>();
    for (const row of rows) {
      if (!map.has(row.colaborador_id)) {
        map.set(row.colaborador_id, {
          colaboradorId: row.colaborador_id,
          colaborador: row.colaborador,
          gerencia: row.gerencia,
          departamento: row.departamento,
          perifericos: [],
        });
      }
      map.get(row.colaborador_id).perifericos.push({
        id: row.asignacionId,
        modeloId: row.modeloId,
        modeloNombre: row.modeloNombre,
        modeloCodigo: row.modeloCodigo,
        tipo: row.tipo,
        cantidad: row.cantidad,
        fechaInicio: row.fechaInicio,
      });
    }
    return Array.from(map.values());
  }
}
