import { create } from 'zustand';
import api from '../services/api';

interface Usuario {
  id: number;
  email: string;
  rol: string;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token'),
  usuario: null,

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>(
      '/api/auth/login',
      { email, password },
    );
    localStorage.setItem('access_token', data.access_token);
    set({ token: data.access_token });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ token: null, usuario: null });
  },
}));
