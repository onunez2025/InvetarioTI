export type RolUsuario = 'ADMIN' | 'GERENTE' | 'TECNICO' | 'VISUALIZADOR';

export interface UsuarioItem {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento?: string;
  activo: boolean;
  creadoEn: string;
  ultimoLogin?: string;
}

export interface CreateUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
  departamento?: string;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  rol?: RolUsuario;
  departamento?: string;
  activo?: boolean;
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  ADMIN:        'Administrador',
  GERENTE:      'Gerente',
  TECNICO:      'Técnico',
  VISUALIZADOR: 'Visualizador',
};

export const ROL_COLORS: Record<RolUsuario, string> = {
  ADMIN:        '#7c3aed',
  GERENTE:      '#2563eb',
  TECNICO:      '#0891b2',
  VISUALIZADOR: '#64748b',
};
