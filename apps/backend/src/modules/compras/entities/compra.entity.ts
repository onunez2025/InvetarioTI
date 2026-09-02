import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { Proveedor }    from '../../proveedores/entities/proveedor.entity';
import { Usuario }      from '../../usuarios/entities/usuario.entity';
import { CompraDetalle } from './compra-detalle.entity';

export type TipoDocumento = 'FACTURA' | 'OC' | 'BOLETA' | 'NOTA_INGRESO';

@Entity({ name: 'compras', schema: 'inventario_ti' })
export class Compra {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Proveedor, { eager: true })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ name: 'proveedor_id' }) proveedorId: number;

  @Column({ name: 'numero_documento', length: 50 }) numeroDocumento: string;

  @Column({ name: 'tipo_documento', length: 20 }) tipoDocumento: TipoDocumento;

  @Column({ name: 'fecha_documento', type: 'date' }) fechaDocumento: string;

  @Column({ length: 500, nullable: true }) observaciones: string;

  @Column({ length: 20, default: 'BORRADOR' })
  estado: string;

  @Column({ name: 'adjunto_url', length: 500, nullable: true })
  adjuntoUrl: string | null;

  @OneToMany(() => CompraDetalle, (d) => d.compra, { cascade: true })
  detalles: CompraDetalle[];

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @Column({ name: 'creado_por', nullable: true }) creadoPorId: number;

  @CreateDateColumn({ name: 'creado_en' }) creadoEn: Date;
}
