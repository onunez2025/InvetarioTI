import api from './api';
import type {
  Asignacion, Colaborador,
  CreateAsignacionPayload, DevolucionPayload,
  CreateColaboradorPayload, UpdateColaboradorPayload,
} from '../types/asignacion.types';

/* ---- Colaboradores ---- */
export const colaboradoresService = {
  async findAll(q?: string): Promise<Colaborador[]> {
    const { data } = await api.get<Colaborador[]>('/api/colaboradores', { params: q ? { q } : {} });
    return data;
  },
  async findById(id: number): Promise<Colaborador> {
    const { data } = await api.get<Colaborador>(`/api/colaboradores/${id}`);
    return data;
  },
  async create(payload: CreateColaboradorPayload): Promise<Colaborador> {
    const { data } = await api.post<Colaborador>('/api/colaboradores', payload);
    return data;
  },
  async update(id: number, payload: UpdateColaboradorPayload): Promise<any> {
    const { data } = await api.put<any>(`/api/colaboradores/${id}`, payload);
    return data;
  },
  async deactivate(id: number): Promise<any> {
    const { data } = await api.delete<any>(`/api/colaboradores/${id}`);
    return data;
  },
};

/* ---- Asignaciones ---- */
export const asignacionesService = {
  async findActivas(): Promise<Asignacion[]> {
    const { data } = await api.get<Asignacion[]>('/api/asignaciones/activas');
    return data;
  },
  async findHistorial(page = 1, limit = 50): Promise<{ data: Asignacion[]; total: number }> {
    const { data } = await api.get<{ data: Asignacion[]; total: number }>(
      '/api/asignaciones/historial', { params: { page, limit } },
    );
    return data;
  },
  async findByEquipo(equipoId: number): Promise<Asignacion[]> {
    const { data } = await api.get<Asignacion[]>(`/api/asignaciones/equipo/${equipoId}`);
    return data;
  },
  async findByColaborador(colaboradorId: number): Promise<Asignacion[]> {
    const { data } = await api.get<Asignacion[]>(`/api/asignaciones/colaborador/${colaboradorId}`);
    return data;
  },
  async findHistorialByColaborador(colaboradorId: number): Promise<Asignacion[]> {
    const { data } = await api.get<Asignacion[]>(`/api/asignaciones/colaborador/${colaboradorId}/historial`);
    return data;
  },
  async findActivaByEquipo(equipoId: number): Promise<Asignacion | null> {
    try {
      const { data } = await api.get<Asignacion>(`/api/asignaciones/equipo/${equipoId}/activa`);
      return data;
    } catch {
      return null;
    }
  },
  async create(payload: CreateAsignacionPayload): Promise<Asignacion> {
    const { data } = await api.post<Asignacion>('/api/asignaciones', payload);
    return data;
  },
  async devolver(id: number, payload: DevolucionPayload): Promise<Asignacion> {
    const { data } = await api.patch<Asignacion>(`/api/asignaciones/${id}/devolver`, payload);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/api/asignaciones/${id}`);
  },
  async registrarFirma(id: number, firma: string): Promise<Asignacion> {
    const { data } = await api.post<Asignacion>(`/api/asignaciones/${id}/firmar`, { firma });
    return data;
  },
};
