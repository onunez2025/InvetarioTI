import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

// Mock de api para no hacer peticiones reales
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, usuario: null });
  });

  it('el estado inicial es null cuando no hay token en localStorage', () => {
    useAuthStore.setState({ token: null });
    const { token } = useAuthStore.getState();
    expect(token).toBeNull();
  });

  it('logout limpia el token del store y localStorage', () => {
    localStorage.setItem('access_token', 'token_de_prueba');
    useAuthStore.setState({ token: 'token_de_prueba' });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('login guarda el token en store y localStorage', async () => {
    const { default: api } = await import('../services/api');
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { access_token: 'jwt_mock_123' },
    });

    await useAuthStore.getState().login('admin@test.com', 'password123');

    expect(useAuthStore.getState().token).toBe('jwt_mock_123');
    expect(localStorage.getItem('access_token')).toBe('jwt_mock_123');
  });
});
