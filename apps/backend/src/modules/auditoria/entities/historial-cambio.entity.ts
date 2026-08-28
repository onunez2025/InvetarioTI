import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'historial_cambios', schema: 'INV_ZYL' })
export class HistorialCambio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @Column({ length: 50 })
  campo: string;

  @Column({ name: 'valor_anterior', type: 'nvarchar', nullable: true })
  valorAnterior: string;

  @Column({ name: 'valor_nuevo', type: 'nvarchar', nullable: true })
  valorNuevo: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @CreateDateColumn()
  fecha: Date;
}
