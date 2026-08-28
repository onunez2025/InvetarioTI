import { create } from 'zustand';
import { equiposService } from '../services/equipos.service';
import type { Equipo, FiltrosEquipos } from '../types/equipo.types';

interface EquiposState {
  equipos: Equipo[];
  total: number;
  cargando: boolean;
  filtros: FiltrosEquipos;
  setFiltros: (filtros: Partial<FiltrosEquipos>) => void;
  cargar: () => Promise<void>;
}

export const useEquiposStore = create<EquiposState>((set, get) => ({
  equipos: [],
  total: 0,
  cargando: false,
  filtros: { page: 1, limit: 50 },

  setFiltros: (nuevos) => {
    set((s) => ({ filtros: { ...s.filtros, ...nuevos } }));
    get().cargar();
  },

  cargar: async () => {
    set({ cargando: true });
    try {
      const { data, total } = await equiposService.listar(get().filtros);
      set({ equipos: data, total });
    } finally {
      set({ cargando: false });
    }
  },
}));
