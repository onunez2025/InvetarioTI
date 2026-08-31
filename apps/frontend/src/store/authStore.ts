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
  usuario: Usuario | null;
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
      // Use nombre from payload, fallback to part before @ in email
      nombre: payload.nombre ?? payload.name ?? (payload.email?.split('@')[0] ?? 'Usuario'),
    };
  } catch {
    return null;
  }
}

const storedToken = localStorage.getItem('access_token');

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  usuario: storedToken ? decodeJwt(storedToken) : null,

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>(
      '/api/auth/login',
      { email, password },
    );
    localStorage.setItem('access_token', data.access_token);
    set({
      token: data.access_token,
      usuario: decodeJwt(data.access_token),
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ token: null, usuario: null });
  },
}));
