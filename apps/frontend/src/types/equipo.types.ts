import type { Modelo } from './modelo.types';

export type EstadoEquipo = 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';

export interface Equipo {
  id: number;
  empresa: string;
  nombre: string;
  gerencia?: string;
  departamento?: string;
  codigo?: string;
  ceco?: string;
  ubicacion?: string;
  serie?: string;
  modeloId?: number;
  modelo?: Modelo;
  estado: EstadoEquipo;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltrosEquipos {
  tipo?: string;
  departamento?: string;
  ubicacion?: string;
  gerencia?: string;
  modeloId?: number;
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export type CreateEquipoPayload = Omit<Equipo, 'id' | 'creadoEn' | 'actualizadoEn' | 'modelo'>;
export type UpdateEquipoPayload = Partial<CreateEquipoPayload>;
