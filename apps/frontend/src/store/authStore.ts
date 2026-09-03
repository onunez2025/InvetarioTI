import { create } from 'zustand';
import api from '../services/api';

export interface Usuario {
  id: number;
  email: string;
  rol: string;
  nombre: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  usuario: Usuario | null;
  setTokens: (access: string, refresh: string, expiresIn: number) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

function decodeJwt(token: string): Usuario | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub ?? 0,
      email: payload.email ?? '',
      rol: payload.rol ?? 'VISUALIZADOR',
      nombre: payload.nombre ?? payload.name ?? (payload.email?.split('@')[0] ?? 'Usuario'),
    };
  } catch {
    return null;
  }
}

const storedToken = localStorage.getItem('access_token');
const storedRefreshToken = localStorage.getItem('refresh_token');
const storedExpiresAt = localStorage.getItem('expires_at');

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  refreshToken: storedRefreshToken,
  expiresAt: storedExpiresAt ? Number(storedExpiresAt) : null,
  usuario: storedToken ? decodeJwt(storedToken) : null,

  setTokens: (access: string, refresh: string, expiresIn: number) => {
    const exp = Date.now() + expiresIn * 1000;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('expires_at', String(exp));
    set({
      token: access,
      refreshToken: refresh,
      expiresAt: exp,
      usuario: decodeJwt(access),
    });
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; refresh_token: string; expires_in?: number }>(
      '/api/auth/login',
      { email, password },
    );
    const expiresIn = data.expires_in ?? 28800;
    const exp = Date.now() + expiresIn * 1000;
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    localStorage.setItem('expires_at', String(exp));
    set({
      token: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: exp,
      usuario: decodeJwt(data.access_token),
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    set({ token: null, refreshToken: null, expiresAt: null, usuario: null });
  },
}));
