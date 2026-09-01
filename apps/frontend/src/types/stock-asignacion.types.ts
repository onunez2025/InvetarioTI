import type { Modelo } from './modelo.types';
import type { Colaborador } from './asignacion.types';

export interface StockAsignacion {
  id: number;
  modeloId: number;
  modelo: Modelo;
  colaboradorId: number;
  colaborador: Colaborador;
  cantidad: number;
  fechaInicio: string;
  fechaFin?: string | null;
  observaciones?: string;
  creadoEn: string;
}

export interface CreateStockAsignacionPayload {
  modeloId: number;
  colaboradorId: number;
  cantidad: number;
  fechaInicio: string;
  observaciones?: string;
}
