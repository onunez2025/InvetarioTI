import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Modelo } from '../modelos/entities/modelo.entity';
import { CreateCompraDto, CreateCompraDetalleDto } from './dto/create-compra.dto';
import { RegistrarUnidadesDto } from './dto/registrar-unidades.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)        private readonly compraRepo: Repository<Compra>,
    @InjectRepository(CompraDetalle) private readonly detalleRepo: Repository<CompraDetalle>,
    @InjectRepository(Equipo)        private readonly equipoRepo: Repository<Equipo>,
    @InjectRepository(Modelo)        private readonly modeloRepo: Repository<Modelo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(page = 1, limit = 20): Promise<{ data: Compra[]; total: number }> {
    const [data, total] = await this.compraRepo.findAndCount({
      relations: { proveedor: true, detalles: { modelo: true } },
      order: { creadoEn: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: number): Promise<Compra> {
    const c = await this.compraRepo.findOne({
      where: { id },
      relations: { proveedor: true, detalles: { modelo: true } },
    });
    if (!c) throw new NotFoundException(`Compra ${id} no encontrada`);
    return c;
  }

  async create(dto: CreateCompraDto, usuarioId: number): Promise<Compra> {
    const compra = this.compraRepo.create({
      proveedorId:     dto.proveedorId,
      numeroDocumento: dto.numeroDocumento,
      tipoDocumento:   dto.tipoDocumento as any,
      fechaDocumento:  dto.fechaDocumento,
      observaciones:   dto.observaciones,
      estado:          'BORRADOR',
      creadoPorId:     usuarioId,
    });
    const saved = await this.compraRepo.save(compra);
    if (dto.detalles?.length) {
      const detalles = dto.detalles.map(d => this.detalleRepo.create({
        compraId: saved.id, modeloId: d.modeloId,
        cantidad: d.cantidad, precioUnitario: d.precioUnitario,
      }));
      await this.detalleRepo.save(detalles);
    }
    return this.findOne(saved.id);
  }

  async aprobar(id: number, usuarioId?: number): Promise<Compra> {
    const compra = await this.compraRepo.findOne({ where: { id } });
    if (!compra) throw new NotFoundException(`Compra ${id} no encontrada`);
    if (compra.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo compras en BORRADOR pueden aprobarse');
    }
    compra.estado = 'APROBADO';
    return this.compraRepo.save(compra);
  }

  async recibirCompra(id: number, usuarioId?: number): Promise<Compra> {
    const compra = await this.compraRepo.findOne({ where: { id } });
    if (!compra) throw new NotFoundException(`Compra ${id} no encontrada`);
    if (compra.estado !== 'APROBADO') {
      throw new BadRequestException('La compra debe estar APROBADA para marcarla como recibida');
    }
    compra.estado = 'RECIBIDO';
    return this.compraRepo.save(compra);
  }

  async guardarAdjunto(id: number, file: Express.Multer.File): Promise<{ adjuntoUrl: string }> {
    const compra = await this.compraRepo.findOne({ where: { id } });
    if (!compra) throw new NotFoundException(`Compra ${id} no encontrada`);
    const uploadsDir = path.resolve('uploads', 'compras', String(id));
    fs.mkdirSync(uploadsDir, { recursive: true });
    const ext = path.extname(file.originalname) || '.pdf';
    const dest = path.join(uploadsDir, `adjunto${ext}`);
    fs.copyFileSync(file.path, dest);
    try {
      fs.unlinkSync(file.path);
    } catch {}
    compra.adjuntoUrl = dest;
    await this.compraRepo.save(compra);
    return { adjuntoUrl: dest };
  }

  async addDetalle(compraId: number, dto: CreateCompraDetalleDto): Promise<CompraDetalle> {
    await this.findOne(compraId);
    const det = this.detalleRepo.create({ compraId, ...dto });
    return this.detalleRepo.save(det);
  }

  async registrarUnidades(detalleId: number, dto: RegistrarUnidadesDto): Promise<Equipo[]> {
    const detalle = await this.detalleRepo.findOne({
      where: { id: detalleId },
      relations: { modelo: true, compra: true },
    });
    if (!detalle) throw new NotFoundException(`Línea de compra ${detalleId} no encontrada`);
    if (detalle.compra && !['APROBADO', 'RECIBIDO'].includes(detalle.compra.estado)) {
      throw new BadRequestException('La compra debe estar APROBADA antes de registrar unidades');
    }
    if (!detalle.modelo.tieneSerie) {
      throw new BadRequestException('Este modelo no usa números de serie (tiene_serie = false)');
    }
    if (dto.series.length > detalle.cantidad) {
      throw new BadRequestException(
        `La compra tiene ${detalle.cantidad} unidades, se enviaron ${dto.series.length} series`,
      );
    }

    const yaRegistradas = await this.equipoRepo.count({
      where: { compraDetalleId: detalleId },
    });
    if (yaRegistradas + dto.series.length > detalle.cantidad) {
      throw new BadRequestException(
        `Solo se pueden registrar ${detalle.cantidad - yaRegistradas} unidades adicionales (ya hay ${yaRegistradas} registradas de ${detalle.cantidad})`,
      );
    }

    const unique = new Set(dto.series);
    if (unique.size !== dto.series.length) {
      throw new BadRequestException('La lista contiene números de serie duplicados');
    }

    const equipos = dto.series.map(serie => this.equipoRepo.create({
      modeloId:        detalle.modeloId,
      compraDetalleId: detalleId,
      serie,
      empresa:     dto.empresa,
      gerencia:    dto.gerencia,
      departamento: dto.departamento,
      ubicacion:   dto.ubicacion,
      ceco:        dto.ceco,
      estado:      'ACTIVO',
    }));

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Equipo, equipos);
      });
      return equipos;
    } catch (err: any) {
      if (err?.message?.includes('UQ') || err?.number === 2627) {
        throw new BadRequestException('Uno o más números de serie ya existen en el sistema');
      }
      throw err;
    }
  }
}
