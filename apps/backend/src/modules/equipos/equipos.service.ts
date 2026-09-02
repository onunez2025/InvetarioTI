import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
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
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    filtros: Omit<FiltroEquiposDto, 'page' | 'limit'>,
    page = 1,
    limit = 50,
  ): Promise<{ data: Equipo[]; total: number }> {
    const qb = this.equipoRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.modelo', 'modelo');

    if (filtros.departamento) qb.andWhere('e.departamento = :dep', { dep: filtros.departamento });
    if (filtros.ubicacion)    qb.andWhere('e.ubicacion = :ub', { ub: filtros.ubicacion });
    if (filtros.estado)       qb.andWhere('e.estado = :estado', { estado: filtros.estado });
    if (filtros.busqueda)     qb.andWhere(
      '(e.nombre LIKE :q OR e.serie LIKE :q OR modelo.nombre LIKE :q OR modelo.codigo LIKE :q)',
      { q: `%${filtros.busqueda}%` },
    );
    if (filtros.tipo)         qb.andWhere('modelo.tipo = :tipo', { tipo: filtros.tipo });

    qb.orderBy('modelo.nombre', 'ASC').addOrderBy('e.serie', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
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

  async bulkUpdateEstado(ids: number[], estado: string): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };
    const placeholders = ids.map((_, i) => `@${i + 1}`).join(',');
    await this.dataSource.query(
      `UPDATE inventario_ti.equipos SET estado=@0 WHERE id IN (${placeholders})`,
      [estado, ...ids],
    );
    return { updated: ids.length };
  }

  async generarQrLabel(id: number): Promise<Buffer> {
    const equipo = await this.findOne(id);
    const url = `https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/${id}`;
    const qrDataUrl: string = await QRCode.toDataURL(url);
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const doc = new PDFDocument({ size: [200, 130], margin: 8 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.font('Helvetica-Bold').fontSize(9).text('MT INDUSTRIAL S.A.C', { align: 'center' });
      doc.font('Helvetica').fontSize(8).text(equipo.nombre ?? 'Sin nombre', { align: 'center' });
      doc.fontSize(7).text(equipo.serie ?? equipo.codigo ?? '', { align: 'center' });
      doc.moveDown(0.3);
      const qrSize = 70;
      const x = (200 - qrSize) / 2;
      doc.image(qrBuffer, x, doc.y, { width: qrSize, height: qrSize });
      doc.end();
    });
  }
}
