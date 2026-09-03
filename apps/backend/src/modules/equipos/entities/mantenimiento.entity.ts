import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'inventario_ti', name: 'mantenimientos' })
export class Mantenimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'equipo_id' })
  equipoId: number;

  @Column({ length: 20 })
  tipo: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ length: 150, nullable: true })
  tecnico: string;

  @Column({ length: 1000, nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costo: number;

  @Column({ length: 500, nullable: true })
  resultado: string;

  @Column({ name: 'creado_por', nullable: true })
  creadoPor: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
