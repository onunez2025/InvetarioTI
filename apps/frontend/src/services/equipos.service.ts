import api from './api';
import type {
  Equipo,
  FiltrosEquipos,
  PaginatedResponse,
  CreateEquipoPayload,
  UpdateEquipoPayload,
} from '../types/equipo.types';

export const equiposService = {
  async listar(filtros: FiltrosEquipos = {}): Promise<PaginatedResponse<Equipo>> {
    const { data } = await api.get<PaginatedResponse<Equipo>>('/api/equipos', {
      params: filtros,
    });
    return data;
  },

  async obtener(id: number): Promise<Equipo> {
    const { data } = await api.get<Equipo>(`/api/equipos/${id}`);
    return data;
  },

  async crear(payload: CreateEquipoPayload): Promise<Equipo> {
    const { data } = await api.post<Equipo>('/api/equipos', payload);
    return data;
  },

  async actualizar(id: number, payload: UpdateEquipoPayload): Promise<Equipo> {
    const { data } = await api.put<Equipo>(`/api/equipos/${id}`, payload);
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/api/equipos/${id}`);
  },

  async historial(id: number) {
    const { data } = await api.get(`/api/equipos/${id}/historial`);
    return data;
  },

  async importarExcel(archivo: File): Promise<{ importados: number; errores: number; detalles: string[] }> {
    const form = new FormData();
    form.append('archivo', archivo);
    const { data } = await api.post('/api/integraciones/importar-excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
