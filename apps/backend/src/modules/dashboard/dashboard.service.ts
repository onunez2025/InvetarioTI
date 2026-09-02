import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async resumen() {
    const [row] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM inventario_ti.equipos) AS totalEquipos,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'ACTIVO') AS activos,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'MANTENIMIENTO') AS enMantenimiento,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'BAJA') AS bajas,
        (SELECT COUNT(*) FROM inventario_ti.modelos
          WHERE end_of_support IS NOT NULL
            AND end_of_support <= DATEADD(DAY,90,GETUTCDATE())
            AND activo=1) AS eosProximos90,
        (SELECT COUNT(*) FROM inventario_ti.colaboradores WHERE activo=1) AS colaboradoresActivos,
        (SELECT COUNT(*) FROM inventario_ti.equipos e WHERE e.estado='ACTIVO'
          AND NOT EXISTS (SELECT 1 FROM inventario_ti.asignaciones a
            WHERE a.equipo_id=e.id AND a.fecha_fin IS NULL)) AS equiposSinAsignar
    `);
    // Stock bajo: modelos tieneSerie=false, disponible <= 3
    const stockRows = await this.dataSource.query(`
      SELECT COUNT(*) AS stockBajo FROM (
        SELECT m.id,
          ISNULL(SUM(cd.cantidad),0) -
          ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
            WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) AS disponible
        FROM inventario_ti.modelos m
        LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id=m.id
        WHERE m.tiene_serie=0 AND m.activo=1
        GROUP BY m.id
        HAVING ISNULL(SUM(cd.cantidad),0) -
          ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
            WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) <= 3
      ) sub
    `);
    return { ...row, stockBajo: stockRows[0]?.stockBajo ?? 0 };
  }

  async graficos() {
    const porTipo = await this.dataSource.query(`
      SELECT m.tipo, COUNT(e.id) AS total
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id=m.id AND e.estado='ACTIVO'
      WHERE m.tipo IS NOT NULL
      GROUP BY m.tipo ORDER BY total DESC
    `);
    const porGerencia = await this.dataSource.query(`
      SELECT TOP 8 e.gerencia, COUNT(e.id) AS total
      FROM inventario_ti.equipos e
      WHERE e.gerencia IS NOT NULL AND e.estado='ACTIVO'
      GROUP BY e.gerencia ORDER BY total DESC
    `);
    const adquisiciones = await this.dataSource.query(`
      SELECT FORMAT(c.fecha_documento,'yyyy-MM') AS mes, SUM(cd.cantidad) AS cantidad
      FROM inventario_ti.compras c
      JOIN inventario_ti.compras_detalle cd ON cd.compra_id=c.id
      WHERE c.fecha_documento >= DATEADD(MONTH,-11,DATEFROMPARTS(YEAR(GETUTCDATE()),MONTH(GETUTCDATE()),1))
      GROUP BY FORMAT(c.fecha_documento,'yyyy-MM')
      ORDER BY mes
    `);
    return { porTipo, porGerencia, adquisicionesPorMes: adquisiciones };
  }

  async eosProximos() {
    const data = await this.dataSource.query(`
      SELECT TOP 20
        m.id AS modeloId, m.codigo, m.nombre, m.tipo, m.marca,
        m.end_of_support AS endOfSupport,
        DATEDIFF(DAY,GETUTCDATE(),m.end_of_support) AS diasRestantes,
        COUNT(e.id) AS totalUnidades
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id=m.id AND e.estado='ACTIVO'
      WHERE m.end_of_support IS NOT NULL
        AND m.end_of_support <= DATEADD(DAY,180,GETUTCDATE())
        AND m.activo=1
      GROUP BY m.id,m.codigo,m.nombre,m.tipo,m.marca,m.end_of_support
      ORDER BY m.end_of_support ASC
    `);
    return { data };
  }

  async actividadReciente() {
    try {
      const data = await this.dataSource.query(`
        SELECT TOP 15
          a.id, a.tabla, a.accion,
          a.descripcion, u.nombre AS usuario, a.creado_en AS fecha
        FROM inventario_ti.auditoria a
        LEFT JOIN inventario_ti.usuarios u ON u.id=a.usuario_id
        ORDER BY a.creado_en DESC
      `);
      return { data };
    } catch {
      const data = await this.dataSource.query(`
        SELECT TOP 15
          h.id,
          'equipos' AS tabla,
          'UPDATE' AS accion,
          CONCAT('Equipo #', h.equipo_id, ': ', h.campo, ' -> ', ISNULL(h.valor_nuevo, '')) AS descripcion,
          ISNULL(u.nombre, 'Sistema') AS usuario,
          h.fecha AS fecha
        FROM inventario_ti.historial_cambios h
        LEFT JOIN inventario_ti.usuarios u ON u.id=h.usuario_id
        ORDER BY h.fecha DESC
      `);
      return { data };
    }
  }
}
