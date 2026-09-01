export interface Modelo {
  id: number;
  codigo: string;
  nombre: string;
  marca?: string;
  tipo?: string;
  descripcion?: string;
  tieneSerie: boolean;
  endOfSale?: string;
  endOfSupport?: string;
  firmwareRef?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreateModeloPayload {
  codigo: string;
  nombre: string;
  marca?: string;
  tipo?: string;
  descripcion?: string;
  tieneSerie: boolean;
  endOfSale?: string;
  endOfSupport?: string;
  firmwareRef?: string;
}
