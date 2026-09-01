export interface Proveedor {
  id: number;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

export interface CreateProveedorPayload {
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
}
