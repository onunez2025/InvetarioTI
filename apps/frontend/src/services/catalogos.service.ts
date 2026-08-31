import type { Catalogo } from '../types/catalogo.types';

const BASE = '/api/catalogos';

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
    throw new Error(err.message ?? 'Error en catálogos');
  }
  return res.json();
}

export const catalogosService = {
  /** Devuelve todos los catálogos agrupados por tipo */
  findAll: (): Promise<Record<string, Catalogo[]>> => req('GET', ''),

  /** Activos de un tipo — para dropdowns en formularios */
  findByTipo: (tipo: string): Promise<Catalogo[]> => req('GET', `/tipo/${tipo}`),

  /** Todos (incluyendo inactivos) de un tipo — para la página Configuración */
  findAllByTipo: (tipo: string): Promise<Catalogo[]> => req('GET', `/admin/${tipo}`),

  create: (tipo: string, nombre: string, extra?: string): Promise<Catalogo> =>
    req('POST', '', { tipo, nombre, extra }),

  update: (id: number, data: { nombre?: string; extra?: string; activo?: boolean }): Promise<Catalogo> =>
    req('PUT', `/${id}`, data),

  remove: (id: number): Promise<void> =>
    req('DELETE', `/${id}`),
};
