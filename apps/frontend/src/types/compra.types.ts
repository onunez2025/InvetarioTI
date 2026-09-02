import type { Proveedor } from './proveedor.types';
import type { Modelo } from './modelo.types';

export type TipoDocumento = 'FACTURA' | 'OC' | 'BOLETA' | 'NOTA_INGRESO';

export interface CompraDetalle {
  id: number;
  compraId: number;
  modeloId: number;
  modelo: Modelo;
  cantidad: number;
  precioUnitario?: number;
}

export interface Compra {
  id: number;
  proveedorId: number;
  proveedor: Proveedor;
  numeroDocumento: string;
  tipoDocumento: TipoDocumento;
  fechaDocumento: string;
  observaciones?: string;
  estado: 'BORRADOR' | 'APROBADO' | 'RECIBIDO';
  adjuntoUrl?: string;
  detalles: CompraDetalle[];
  creadoEn: string;
}

export interface CreateCompraPayload {
  proveedorId: number;
  numeroDocumento: string;
  tipoDocumento: TipoDocumento;
  fechaDocumento: string;
  observaciones?: string;
  detalles: { modeloId: number; cantidad: number; precioUnitario?: number }[];
}
