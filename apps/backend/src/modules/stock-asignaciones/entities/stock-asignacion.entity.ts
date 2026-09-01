import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Modelo }      from '../../modelos/entities/modelo.entity';
import { Colaborador } from '../../colaboradores/entities/colaborador.entity';
import { Usuario }     from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'stock_asignaciones', schema: 'inventario_ti' })
export class StockAsignacion {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Modelo, { eager: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id' }) modeloId: number;

  @ManyToOne(() => Colaborador, { eager: true })
  @JoinColumn({ name: 'colaborador_id' })
  colaborador: Colaborador;

  @Column({ name: 'colaborador_id' }) colaboradorId: number;

  @Column({ default: 1 }) cantidad: number;

  @Column({ name: 'fecha_inicio', type: 'date' }) fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true }) fechaFin: string | null;

  @Column({ length: 500, nullable: true }) observaciones: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @Column({ name: 'creado_por', nullable: true }) creadoPorId: number;

  @CreateDateColumn({ name: 'creado_en' }) creadoEn: Date;
}
