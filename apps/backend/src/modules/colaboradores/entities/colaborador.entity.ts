import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'colaboradores', schema: 'inventario_ti' })
export class Colaborador {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 15, nullable: true })
  dni: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 100, nullable: true })
  cargo: string;

  @Column({ length: 100, nullable: true })
  gerencia: string;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
