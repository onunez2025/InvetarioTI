import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'inventario_ti', name: 'notificaciones' })
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 200 })
  titulo: string;

  @Column({ length: 1000 })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
