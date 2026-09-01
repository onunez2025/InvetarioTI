import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'modelos', schema: 'inventario_ti' })
export class Modelo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  @Column({ length: 50, nullable: true })
  tipo: string;

  @Column({ length: 500, nullable: true })
  descripcion: string;

  @Column({ name: 'tiene_serie', default: true })
  tieneSerie: boolean;

  @Column({ name: 'end_of_sale', type: 'date', nullable: true })
  endOfSale: Date;

  @Column({ name: 'end_of_support', type: 'date', nullable: true })
  endOfSupport: Date;

  @Column({ name: 'firmware_ref', length: 100, nullable: true })
  firmwareRef: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
