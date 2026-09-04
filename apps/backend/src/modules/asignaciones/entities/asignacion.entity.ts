import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Colaborador } from '../../colaboradores/entities/colaborador.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'asignaciones', schema: 'inventario_ti' })
export class Asignacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipo, { eager: true })
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @Column({ name: 'equipo_id' })
  equipoId: number;

  @ManyToOne(() => Colaborador, { eager: true })
  @JoinColumn({ name: 'colaborador_id' })
  colaborador: Colaborador;

  @Column({ name: 'colaborador_id' })
  colaboradorId: number;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ length: 500, nullable: true })
  observaciones: string;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @Column({ name: 'creado_por', nullable: true })
  creadoPorId: number;

  @Column({ name: 'firma_digital', type: 'nvarchar', length: 'MAX', nullable: true })
  firmaDigital: string | null;

  @Column({ name: 'fecha_firma', type: 'datetime2', nullable: true })
  fechaFirma: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
