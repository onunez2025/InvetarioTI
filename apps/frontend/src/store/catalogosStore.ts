import { create } from 'zustand';
import type { Catalogo } from '../types/catalogo.types';
import { catalogosService } from '../services/catalogos.service';

interface CatalogosState {
  catalogs: Record<string, Catalogo[]>;
  cargando: boolean;
  cargado: boolean;
  cargar: () => Promise<void>;
  getOptions: (tipo: string) => string[];
  invalidar: () => void;
}

export const useCatalogosStore = create<CatalogosState>((set, get) => ({
  catalogs: {},
  cargando: false,
  cargado: false,

  cargar: async () => {
    if (get().cargando || get().cargado) return;
    set({ cargando: true });
    try {
      const data = await catalogosService.findAll();
      set({ catalogs: data, cargado: true });
    } catch (e) {
      console.warn('No se pudieron cargar los catálogos:', e);
    } finally {
      set({ cargando: false });
    }
  },

  /** Devuelve los nombres activos de un tipo — para usar como opciones de Select */
  getOptions: (tipo: string): string[] => {
    const items = get().catalogs[tipo] ?? [];
    return items.filter(c => c.activo).map(c => c.nombre);
  },

  /** Invalida la cache para que el próximo cargar() vuelva a pedir al servidor */
  invalidar: () => set({ cargado: false }),
}));
