import type { UsuarioItem, CreateUsuarioPayload, UpdateUsuarioPayload } from '../types/usuario.types';

const BASE = '/api/usuarios';

function headers() {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Error en usuarios');
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T;
  return res.json();
}

export const usuariosService = {
  findAll: (): Promise<UsuarioItem[]> => req('GET', ''),
  findOne: (id: number): Promise<UsuarioItem> => req('GET', `/${id}`),
  create: (data: CreateUsuarioPayload): Promise<UsuarioItem> => req('POST', '', data),
  update: (id: number, data: UpdateUsuarioPayload): Promise<UsuarioItem> => req('PUT', `/${id}`, data),
  cambiarPassword: (id: number, password: string): Promise<void> => req('PATCH', `/${id}/password`, { password }),
  deactivate: (id: number): Promise<void> => req('DELETE', `/${id}`),
};
