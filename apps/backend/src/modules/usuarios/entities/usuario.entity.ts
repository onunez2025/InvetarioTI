import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type RolUsuario = 'ADMIN' | 'GERENTE' | 'TECNICO' | 'VISUALIZADOR';

@Entity({ name: 'usuarios', schema: 'inventario_ti' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 20 })
  rol: RolUsuario;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @Column({ name: 'ultimo_login', nullable: true })
  ultimoLogin: Date;
}
