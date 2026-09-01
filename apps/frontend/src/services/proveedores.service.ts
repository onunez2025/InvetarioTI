import api from './api';
import type { Proveedor, CreateProveedorPayload } from '../types/proveedor.types';

export const proveedoresService = {
  listar:     () => api.get<Proveedor[]>('/api/proveedores').then(r => r.data),
  crear:      (d: CreateProveedorPayload) => api.post<Proveedor>('/api/proveedores', d).then(r => r.data),
  actualizar: (id: number, d: Partial<CreateProveedorPayload>) =>
    api.patch<Proveedor>(`/api/proveedores/${id}`, d).then(r => r.data),
};
