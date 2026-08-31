import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'catalogos', schema: 'inventario_ti' })
export class Catalogo {
  @PrimaryGeneratedColumn()
  id: number;

  /** Tipo de catálogo: empresa | tipo_equipo | marca | ubicacion | gerencia | departamento | ceco */
  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 200 })
  nombre: string;

  /** Campo extra libre (ej: RUC para empresas, código para CECOs) */
  @Column({ length: 200, nullable: true })
  extra: string;

  /**
   * Jerarquía: departamento.parentId → gerencia.id
   *            ubicacion.parentId  → departamento.id
   */
  @Column({ name: 'parent_id', nullable: true })
  parentId: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
