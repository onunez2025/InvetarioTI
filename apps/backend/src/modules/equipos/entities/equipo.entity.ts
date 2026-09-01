import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Usuario }       from '../../usuarios/entities/usuario.entity';
import { Modelo }        from '../../modelos/entities/modelo.entity';
import { CompraDetalle } from '../../compras/entities/compra-detalle.entity';

export type EstadoEquipo = 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';

@Entity({ name: 'equipos', schema: 'inventario_ti' })
export class Equipo {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Modelo, { eager: true, nullable: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id', nullable: true }) modeloId: number;

  @ManyToOne(() => CompraDetalle, { eager: false, nullable: true })
  @JoinColumn({ name: 'compra_detalle_id' })
  compraDetalle: CompraDetalle;

  @Column({ name: 'compra_detalle_id', nullable: true }) compraDetalleId: number;

  @Column({ length: 100 })               empresa: string;
  @Column({ length: 150, nullable: true }) nombre: string;   // alias opcional de la unidad
  @Column({ length: 100, nullable: true }) gerencia: string;
  @Column({ length: 100, nullable: true }) departamento: string;
  @Column({ length: 50, nullable: true })  codigo: string;
  @Column({ length: 100, nullable: true }) ceco: string;
  @Column({ length: 150, nullable: true }) ubicacion: string;
  @Column({ length: 100, nullable: true, unique: true }) serie: string;
  @Column({ length: 20, default: 'ACTIVO' }) estado: EstadoEquipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @CreateDateColumn({ name: 'creado_en' })     creadoEn: Date;
  @UpdateDateColumn({ name: 'actualizado_en' }) actualizadoEn: Date;
}
