import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, DataSource } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Asignacion } from './entities/asignacion.entity';
import { CreateAsignacionDto, DevolucionDto } from './dto/asignacion.dto';

@Injectable()
export class AsignacionesService {
  constructor(
    @InjectRepository(Asignacion)
    private readonly repo: Repository<Asignacion>,
    private readonly dataSource: DataSource,
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

  /** Generar Acta de Entrega PDF firmable */
  async generarActa(colaboradorId: number, usuarioTi?: { nombre?: string }): Promise<Buffer> {
    const [colab] = await this.dataSource.query(
      `
      SELECT nombre, cargo, gerencia, departamento
      FROM inventario_ti.colaboradores WHERE id=@0
    `,
      [colaboradorId],
    );
    if (!colab) throw new NotFoundException('Colaborador no encontrado');

    const equipos = await this.dataSource.query(
      `
      SELECT e.nombre AS dispositivo, m.nombre AS modelo, m.tipo,
             e.serie, e.codigo, a.fecha_inicio AS fecha_asignacion
      FROM inventario_ti.asignaciones a
      JOIN inventario_ti.equipos e ON e.id=a.equipo_id
      LEFT JOIN inventario_ti.modelos m ON m.id=e.modelo_id
      WHERE a.colaborador_id=@0 AND a.fecha_fin IS NULL
      ORDER BY a.fecha_inicio
    `,
      [colaboradorId],
    );

    const perifericos = await this.dataSource.query(
      `
      SELECT m.nombre AS modelo, m.tipo, sa.cantidad, sa.fecha_inicio
      FROM inventario_ti.stock_asignaciones sa
      JOIN inventario_ti.modelos m ON m.id=sa.modelo_id
      WHERE sa.colaborador_id=@0 AND sa.fecha_fin IS NULL
      ORDER BY sa.fecha_inicio
    `,
      [colaboradorId],
    );

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const fechaHoy = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      // Header
      doc.rect(50, 45, 495, 60).fill('#1e293b');
      doc.fill('white').font('Helvetica-Bold').fontSize(14)
         .text('MT INDUSTRIAL S.A.C', 50, 55, { align: 'center', width: 495 });
      doc.font('Helvetica').fontSize(11)
         .text('ACTA DE ENTREGA DE EQUIPOS TI', 50, 73, { align: 'center', width: 495 });
      doc.fill('#94a3b8').fontSize(9)
         .text(`Fecha: ${fechaHoy}`, 50, 90, { align: 'center', width: 495 });

      // Colaborador
      doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11)
         .text('DATOS DEL COLABORADOR', 50, 125);
      doc.fill('#e2e8f0').rect(50, 137, 495, 1).fill();
      doc.fill('#334155').font('Helvetica').fontSize(10);
      doc.text(`Nombre: ${colab.nombre}`, 50, 145);
      doc.text(`Cargo: ${colab.cargo ?? '—'}`, 50, 160);
      doc.text(`Gerencia: ${colab.gerencia ?? '—'}   |   Departamento: ${colab.departamento ?? '—'}`, 50, 175);

      // Equipos
      let y = 205;
      doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11).text('EQUIPOS ASIGNADOS', 50, y);
      y += 18;
      doc.fill('#e2e8f0').rect(50, y - 2, 495, 1).fill();

      // Encabezado tabla equipos
      doc.fill('white').rect(50, y, 495, 16).fill('#1e293b');
      doc.fill('white').font('Helvetica-Bold').fontSize(8)
         .text('DISPOSITIVO', 55, y + 4, { width: 140 })
         .text('MODELO', 195, y + 4, { width: 130 })
         .text('SERIE', 325, y + 4, { width: 100 })
         .text('FECHA', 425, y + 4, { width: 80 });
      y += 16;

      equipos.forEach((e: any, i: number) => {
        const bg = i % 2 === 0 ? '#f8f9fa' : 'white';
        doc.fill(bg).rect(50, y, 495, 14).fill();
        doc.fill('#334155').font('Helvetica').fontSize(8)
           .text(e.dispositivo ?? '', 55, y + 3, { width: 138 })
           .text(e.modelo ?? '', 195, y + 3, { width: 128 })
           .text(e.serie ?? e.codigo ?? '', 325, y + 3, { width: 98 })
           .text(e.fecha_asignacion ? new Date(e.fecha_asignacion).toLocaleDateString('es-PE') : '', 425, y + 3, { width: 78 });
        y += 14;
      });

      if (equipos.length === 0) {
        doc.fill('#94a3b8').font('Helvetica').fontSize(9).text('Sin equipos asignados', 55, y + 3);
        y += 14;
      }
      y += 12;

      // Periféricos
      if (perifericos.length > 0) {
        doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11).text('PERIFÉRICOS ASIGNADOS', 50, y);
        y += 18;
        doc.fill('#e2e8f0').rect(50, y - 2, 495, 1).fill();
        doc.fill('white').rect(50, y, 495, 16).fill('#1e293b');
        doc.fill('white').font('Helvetica-Bold').fontSize(8)
           .text('MODELO', 55, y + 4, { width: 220 })
           .text('TIPO', 275, y + 4, { width: 100 })
           .text('CANTIDAD', 375, y + 4, { width: 80 })
           .text('DESDE', 455, y + 4, { width: 80 });
        y += 16;

        perifericos.forEach((p: any, i: number) => {
          const bg = i % 2 === 0 ? '#f8f9fa' : 'white';
          doc.fill(bg).rect(50, y, 495, 14).fill();
          doc.fill('#334155').font('Helvetica').fontSize(8)
             .text(p.modelo ?? '', 55, y + 3, { width: 218 })
             .text(p.tipo ?? '', 275, y + 3, { width: 98 })
             .text(String(p.cantidad ?? 1), 375, y + 3, { width: 78 })
             .text(p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-PE') : '', 455, y + 3, { width: 78 });
          y += 14;
        });
        y += 12;
      }

      // Declaración
      y = Math.max(y, 600);
      doc.fill('#334155').font('Helvetica').fontSize(9).text(
        'El colaborador declara recibir los equipos listados en buen estado y se compromete a conservarlos adecuadamente y devolverlos al término de su vínculo laboral.',
        50, y, { width: 495, align: 'justify' }
      );
      y += 40;

      // Firmas
      doc.fill('#334155').font('Helvetica').fontSize(9);
      doc.moveTo(70, y).lineTo(230, y).stroke('#1e293b');
      doc.moveTo(330, y).lineTo(490, y).stroke('#1e293b');
      doc.text(colab.nombre, 70, y + 4, { width: 160, align: 'center' });
      doc.text(usuarioTi?.nombre ?? 'Responsable TI', 330, y + 4, { width: 160, align: 'center' });
      doc.fill('#94a3b8').fontSize(8)
         .text('Firma colaborador', 70, y + 15, { width: 160, align: 'center' })
         .text('Firma responsable TI', 330, y + 15, { width: 160, align: 'center' });

      doc.end();
    });
  }

  async porDepartamento() {
    return this.dataSource.query(`
      SELECT e.gerencia, e.departamento,
             COUNT(a.id) AS totalAsignaciones,
             COUNT(DISTINCT a.colaborador_id) AS colaboradoresConEquipo,
             COUNT(DISTINCT a.equipo_id) AS equipos
      FROM inventario_ti.asignaciones a
      JOIN inventario_ti.equipos e ON e.id = a.equipo_id
      WHERE a.fecha_fin IS NULL
      GROUP BY e.gerencia, e.departamento
      ORDER BY e.gerencia, e.departamento
    `);
  }
}
