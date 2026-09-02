import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildExcel } from './excel.builder';

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async equipos(filtros: { estado?: string; gerencia?: string; modeloId?: string }) {
    let sql = `
      SELECT TOP 10000
             e.codigo, e.nombre, m.codigo AS modeloCodigo, m.tipo, m.marca,
             e.serie, e.estado, e.gerencia, e.departamento, e.ubicacion, e.ceco,
             CONCAT(c.nombre, ' ', c.apellido) AS colaborador
      FROM inventario_ti.equipos e
      LEFT JOIN inventario_ti.modelos m ON m.id = e.modelo_id
      LEFT JOIN inventario_ti.asignaciones a ON a.equipo_id = e.id AND a.fecha_fin IS NULL
      LEFT JOIN inventario_ti.colaboradores c ON c.id = a.colaborador_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filtros.estado) {
      sql += ` AND e.estado = @${params.length}`;
      params.push(filtros.estado);
    }
    if (filtros.gerencia) {
      sql += ` AND e.gerencia = @${params.length}`;
      params.push(filtros.gerencia);
    }
    if (filtros.modeloId) {
      sql += ` AND e.modelo_id = @${params.length}`;
      params.push(parseInt(filtros.modeloId, 10));
    }
    sql += ` ORDER BY e.nombre`;
    const rows = await this.ds.query(sql, params);
    return buildExcel(
      'Equipos',
      [
        { key: 'codigo', header: 'Código', width: 14 },
        { key: 'nombre', header: 'Nombre dispositivo', width: 28 },
        { key: 'modeloCodigo', header: 'Modelo', width: 20 },
        { key: 'tipo', header: 'Tipo', width: 14 },
        { key: 'marca', header: 'Marca', width: 14 },
        { key: 'serie', header: 'Serie', width: 20 },
        { key: 'estado', header: 'Estado', width: 12 },
        { key: 'colaborador', header: 'Asignado a', width: 28 },
        { key: 'gerencia', header: 'Gerencia', width: 12 },
        { key: 'departamento', header: 'Departamento', width: 28 },
        { key: 'ubicacion', header: 'Ubicación', width: 20 },
        { key: 'ceco', header: 'CECO', width: 12 },
      ],
      rows,
    );
  }

  async eos() {
    const rows = await this.ds.query(`
      SELECT TOP 10000
             m.codigo, m.nombre, m.tipo, m.marca,
             m.end_of_sale AS endOfSale, m.end_of_support AS endOfSupport,
             DATEDIFF(DAY, GETUTCDATE(), m.end_of_support) AS diasRestantes,
             COUNT(e.id) AS totalUnidades,
             SUM(CASE WHEN e.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS activos
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id = m.id
      WHERE m.end_of_support IS NOT NULL
        AND m.end_of_support <= DATEADD(DAY, 365, GETUTCDATE())
        AND m.activo = 1
      GROUP BY m.codigo, m.nombre, m.tipo, m.marca, m.end_of_sale, m.end_of_support
      ORDER BY m.end_of_support ASC
    `);
    return buildExcel(
      'EOS Próximos',
      [
        { key: 'codigo', header: 'Código', width: 14 },
        { key: 'nombre', header: 'Nombre', width: 28 },
        { key: 'tipo', header: 'Tipo', width: 14 },
        { key: 'marca', header: 'Marca', width: 14 },
        { key: 'endOfSale', header: 'End of Sale', width: 14, numFmt: 'DD/MM/YYYY' },
        { key: 'endOfSupport', header: 'End of Support', width: 16, numFmt: 'DD/MM/YYYY' },
        { key: 'diasRestantes', header: 'Días restantes', width: 16 },
        { key: 'totalUnidades', header: 'Total unidades', width: 14 },
        { key: 'activos', header: 'Activos', width: 10 },
      ],
      rows,
    );
  }

  async porGerencia() {
    const rows = await this.ds.query(`
      SELECT TOP 10000
             e.gerencia, e.departamento,
             COUNT(e.id) AS totalEquipos,
             SUM(CASE WHEN e.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS activos,
             SUM(CASE WHEN e.estado = 'MANTENIMIENTO' THEN 1 ELSE 0 END) AS enMantenimiento,
             SUM(CASE WHEN e.estado = 'BAJA' THEN 1 ELSE 0 END) AS bajas,
             SUM(cd.precio_unitario) AS valorTotal
      FROM inventario_ti.equipos e
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.id = e.compra_detalle_id
      GROUP BY e.gerencia, e.departamento
      ORDER BY e.gerencia, e.departamento
    `);
    return buildExcel(
      'Por Gerencia',
      [
        { key: 'gerencia', header: 'Gerencia', width: 14 },
        { key: 'departamento', header: 'Departamento', width: 32 },
        { key: 'totalEquipos', header: 'Total', width: 10 },
        { key: 'activos', header: 'Activos', width: 10 },
        { key: 'enMantenimiento', header: 'Mant.', width: 10 },
        { key: 'bajas', header: 'Bajas', width: 10 },
        { key: 'valorTotal', header: 'Valor total S/', width: 16, numFmt: '#,##0.00' },
      ],
      rows,
    );
  }

  async asignacionesActivas() {
    const rows = await this.ds.query(`
      SELECT TOP 10000
             CONCAT(c.nombre, ' ', c.apellido) AS colaborador,
             c.gerencia, c.departamento,
             e.nombre AS equipo, m.nombre AS modelo, m.tipo,
             e.serie, e.codigo, a.fecha_inicio AS fechaAsignacion,
             DATEDIFF(DAY, a.fecha_inicio, GETUTCDATE()) AS diasAsignado
      FROM inventario_ti.asignaciones a
      JOIN inventario_ti.equipos e ON e.id = a.equipo_id
      JOIN inventario_ti.colaboradores c ON c.id = a.colaborador_id
      LEFT JOIN inventario_ti.modelos m ON m.id = e.modelo_id
      WHERE a.fecha_fin IS NULL
      ORDER BY c.apellido, c.nombre
    `);
    return buildExcel(
      'Asignaciones Activas',
      [
        { key: 'colaborador', header: 'Colaborador', width: 28 },
        { key: 'gerencia', header: 'Gerencia', width: 12 },
        { key: 'departamento', header: 'Departamento', width: 28 },
        { key: 'equipo', header: 'Dispositivo', width: 24 },
        { key: 'modelo', header: 'Modelo', width: 20 },
        { key: 'tipo', header: 'Tipo', width: 14 },
        { key: 'serie', header: 'Serie', width: 18 },
        { key: 'codigo', header: 'Código', width: 14 },
        { key: 'fechaAsignacion', header: 'Fecha asignación', width: 18, numFmt: 'DD/MM/YYYY' },
        { key: 'diasAsignado', header: 'Días asignado', width: 14 },
      ],
      rows,
    );
  }
}
