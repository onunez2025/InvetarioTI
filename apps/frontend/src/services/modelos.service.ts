import api from './api';
import type { Modelo, CreateModeloPayload } from '../types/modelo.types';

export const modelosService = {
  listar: (p?: { tipo?: string; tieneSerie?: boolean; activo?: boolean }) =>
    api.get<{ data: Modelo[]; total: number }>('/api/modelos', { params: p }).then(r => r.data),
  obtener: (id: number) => api.get<Modelo>(`/api/modelos/${id}`).then(r => r.data),
  crear:   (d: CreateModeloPayload) => api.post<Modelo>('/api/modelos', d).then(r => r.data),
  actualizar: (id: number, d: Partial<CreateModeloPayload>) =>
    api.patch<Modelo>(`/api/modelos/${id}`, d).then(r => r.data),
};
