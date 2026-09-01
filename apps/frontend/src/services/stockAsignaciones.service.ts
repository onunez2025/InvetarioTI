import api from './api';
import type { StockAsignacion, CreateStockAsignacionPayload } from '../types/stock-asignacion.types';

export const stockAsignacionesService = {
  porColaborador: (id: number, activas = false) =>
    api.get<StockAsignacion[]>(`/api/stock-asignaciones/colaborador/${id}`, { params: { activas } }).then(r => r.data),
  crear:    (d: CreateStockAsignacionPayload) => api.post<StockAsignacion>('/api/stock-asignaciones', d).then(r => r.data),
  devolver: (id: number, fechaFin: string)    => api.patch<StockAsignacion>(`/api/stock-asignaciones/${id}/devolver`, { fechaFin }).then(r => r.data),
};
