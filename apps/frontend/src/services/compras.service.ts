import api from './api';
import type { Compra, CreateCompraPayload } from '../types/compra.types';

export const comprasService = {
  listar:  (page = 1) => api.get<{ data: Compra[]; total: number }>('/api/compras', { params: { page } }).then(r => r.data),
  obtener: (id: number) => api.get<Compra>(`/api/compras/${id}`).then(r => r.data),
  crear:   (d: CreateCompraPayload) => api.post<Compra>('/api/compras', d).then(r => r.data),
  aprobar: (id: number) => api.patch<Compra>(`/api/compras/${id}/aprobar`).then(r => r.data),
  recibir: (id: number) => api.patch<Compra>(`/api/compras/${id}/recibir`).then(r => r.data),
  uploadAdjunto: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ adjuntoUrl: string }>(`/api/compras/${id}/adjunto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  registrarUnidades: (detalleId: number, series: string[], empresa: string, extras?: Record<string, string>) =>
    api.post(`/api/compras/detalle/${detalleId}/registrar-unidades`, { series, empresa, ...extras }).then(r => r.data),
};
