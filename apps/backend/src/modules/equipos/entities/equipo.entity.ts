import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type EstadoEquipo = 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';

@Entity({ name: 'equipos', schema: 'inventario_ti' })
export class Equipo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  empresa: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 100, nullable: true })
  gerencia: string;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ length: 50, nullable: true })
  codigo: string;

  @Column({ length: 100, nullable: true })
  ceco: string;

  @Column({ length: 150, nullable: true })
  ubicacion: string;

  @Column({ length: 50, nullable: true })
  tipo: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  @Column({ length: 150, nullable: true })
  modelo: string;

  @Column({ length: 100, nullable: true, unique: true })
  serie: string;

  @Column({ length: 100, nullable: true })
  firmware: string;

  @Column({ length: 50, nullable: true })
  version: string;

  @Column({ name: 'end_of_sale', type: 'date', nullable: true })
  endOfSale: Date;

  @Column({ name: 'end_of_support', type: 'date', nullable: true })
  endOfSupport: Date;

  @Column({ length: 20, default: 'ACTIVO' })
  estado: EstadoEquipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
