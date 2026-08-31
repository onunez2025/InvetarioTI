import { create } from 'zustand';
import type { Catalogo } from '../types/catalogo.types';
import { catalogosService } from '../services/catalogos.service';

interface CatalogosState {
  catalogs: Record<string, Catalogo[]>;
  cargando: boolean;
  cargado: boolean;
  cargar: () => Promise<void>;
  /** Nombres activos de un tipo (para selects simples) */
  getOptions: (tipo: string) => string[];
  /** Objetos completos activos de un tipo (incluye id y parentId) */
  getItems: (tipo: string) => Catalogo[];
  /** Hijos activos de un padre específico */
  getChildren: (tipo: string, parentId: number) => Catalogo[];
  /** Busca un catálogo por id en cualquier tipo */
  getById: (id: number) => Catalogo | undefined;
  /** Invalida la cache para que el próximo cargar() vuelva a pedir al servidor */
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

  getOptions: (tipo: string): string[] => {
    const items = get().catalogs[tipo] ?? [];
    return items.filter(c => c.activo).map(c => c.nombre);
  },

  getItems: (tipo: string): Catalogo[] => {
    return (get().catalogs[tipo] ?? []).filter(c => c.activo);
  },

  getChildren: (tipo: string, parentId: number): Catalogo[] => {
    return (get().catalogs[tipo] ?? []).filter(c => c.activo && c.parentId === parentId);
  },

  getById: (id: number): Catalogo | undefined => {
    for (const items of Object.values(get().catalogs)) {
      const found = items.find(c => c.id === id);
      if (found) return found;
    }
    return undefined;
  },

  invalidar: () => set({ cargado: false }),
}));
