import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEquiposStore } from '../store/equiposStore';

// Mock del servicio de equipos
vi.mock('../services/equipos.service', () => ({
  equiposService: {
    listar: vi.fn(),
  },
}));

const equiposMock = [
  { id: 1, nombre: 'CORE1', tipo: 'SWITCH', estado: 'ACTIVO', empresa: 'MT INDUSTRIAL', creadoEn: '', actualizadoEn: '' },
  { id: 2, nombre: 'SRV1', tipo: 'SERVIDOR', estado: 'ACTIVO', empresa: 'MT INDUSTRIAL', creadoEn: '', actualizadoEn: '' },
];

describe('equiposStore', () => {
  beforeEach(() => {
    useEquiposStore.setState({ equipos: [], total: 0, cargando: false, filtros: { page: 1, limit: 50 } });
    vi.clearAllMocks();
  });

  it('cargar actualiza equipos y total', async () => {
    const { equiposService } = await import('../services/equipos.service');
    (equiposService.listar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: equiposMock,
      total: 2,
    });

    await useEquiposStore.getState().cargar();

    expect(useEquiposStore.getState().equipos).toHaveLength(2);
    expect(useEquiposStore.getState().total).toBe(2);
    expect(useEquiposStore.getState().cargando).toBe(false);
  });

  it('setFiltros actualiza filtros y llama cargar', async () => {
    const { equiposService } = await import('../services/equipos.service');
    (equiposService.listar as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [], total: 0 });

    useEquiposStore.getState().setFiltros({ tipo: 'SWITCH', page: 1 });

    expect(useEquiposStore.getState().filtros.tipo).toBe('SWITCH');
  });
});
