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
  tipo?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  firmware?: string;
  version?: string;
  endOfSale?: string;
  endOfSupport?: string;
  estado: EstadoEquipo;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltrosEquipos {
  tipo?: string;
  departamento?: string;
  ubicacion?: string;
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export type CreateEquipoPayload = Omit<Equipo, 'id' | 'creadoEn' | 'actualizadoEn'>;
export type UpdateEquipoPayload = Partial<CreateEquipoPayload>;
