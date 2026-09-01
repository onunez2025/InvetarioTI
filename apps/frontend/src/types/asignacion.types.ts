export interface Colaborador {
  id: number;
  nombre: string;
  dni?: string;
  email?: string;
  cargo?: string;
  gerencia?: string;
  departamento?: string;
  activo: boolean;
  creadoEn: string;
}

export interface AsignacionEquipo {
  id: number;
  nombre: string;
  tipo?: string;
  serie?: string;
  marca?: string;
  modelo?: string;
  gerencia?: string;
  departamento?: string;
  ubicacion?: string;
}

export interface Asignacion {
  id: number;
  equipoId: number;
  equipo: AsignacionEquipo;
  colaboradorId: number;
  colaborador: Colaborador;
  fechaInicio: string;
  fechaFin: string | null;   // null = activa
  observaciones?: string;
  creadoEn: string;
}

export interface CreateAsignacionPayload {
  equipoId: number;
  colaboradorId: number;
  fechaInicio: string;
  observaciones?: string;
}

export interface DevolucionPayload {
  fechaFin: string;
  observaciones?: string;
}

export interface CreateColaboradorPayload {
  nombre: string;
  dni?: string;
  email?: string;
  cargo?: string;
  gerencia?: string;
  departamento?: string;
}

export interface UpdateColaboradorPayload extends Partial<CreateColaboradorPayload> {
  activo?: boolean;
}
