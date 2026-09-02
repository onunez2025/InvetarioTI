import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

export interface StockResumen {
  modeloId: number;
  codigo: string;
  nombre: string;
  marca: string;
  tipo: string;
  totalIngresado: number;
  asignado: number;
  disponible: number;
}

@Injectable()
export class InventarioService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async stockResumen(): Promise<StockResumen[]> {
    const rows = await this.em.query(`
      SELECT
        m.id           AS modeloId,
        m.codigo       AS modeloCodigo,
        m.nombre       AS modeloNombre,
        m.marca,
        m.tipo,
        ISNULL(SUM(cd.cantidad), 0)  AS totalIngresado,
        ISNULL(sa.asignado, 0)       AS asignado,
        ISNULL(SUM(cd.cantidad), 0) - ISNULL(sa.asignado, 0) AS disponible
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id = m.id
      LEFT JOIN (
        SELECT modelo_id, SUM(cantidad) AS asignado
        FROM inventario_ti.stock_asignaciones
        WHERE fecha_fin IS NULL
        GROUP BY modelo_id
      ) sa ON sa.modelo_id = m.id
      WHERE m.tiene_serie = 0 AND m.activo = 1
      GROUP BY m.id, m.codigo, m.nombre, m.marca, m.tipo, sa.asignado
      ORDER BY m.nombre
    `);
    return rows;
  }

  async resumenPorModelo(): Promise<any[]> {
    return this.em.query(`
      SELECT
        m.id AS modeloId, m.codigo AS modeloCodigo, m.nombre AS modeloNombre, m.marca, m.tipo,
        COUNT(e.id)                                              AS total,
        SUM(CASE WHEN e.estado = 'ACTIVO' THEN 1 ELSE 0 END)   AS activos,
        SUM(CASE WHEN e.estado = 'BAJA' THEN 1 ELSE 0 END)     AS bajas,
        SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END)       AS asignados,
        SUM(CASE WHEN e.estado = 'ACTIVO' AND a.id IS NULL THEN 1 ELSE 0 END) AS disponibles
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id = m.id
      LEFT JOIN inventario_ti.asignaciones a ON a.equipo_id = e.id AND a.fecha_fin IS NULL
      WHERE m.tiene_serie = 1 AND m.activo = 1
      GROUP BY m.id, m.codigo, m.nombre, m.marca, m.tipo
      ORDER BY m.nombre
    `);
  }
}
