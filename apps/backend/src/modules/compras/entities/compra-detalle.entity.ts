import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Compra }  from './compra.entity';
import { Modelo }  from '../../modelos/entities/modelo.entity';

@Entity({ name: 'compras_detalle', schema: 'inventario_ti' })
export class CompraDetalle {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Compra, (c) => c.detalles)
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;

  @Column({ name: 'compra_id' }) compraId: number;

  @ManyToOne(() => Modelo, { eager: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id' }) modeloId: number;

  @Column() cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioUnitario: number;
}
