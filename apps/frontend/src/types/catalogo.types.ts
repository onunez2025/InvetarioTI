export interface Catalogo {
  id: number;
  tipo: string;
  nombre: string;
  extra?: string;
  /** Jerarquía: departamento.parentId = gerencia.id  /  ubicacion.parentId = departamento.id */
  parentId?: number;
  activo: boolean;
  creadoEn: string;
}

/** Mapa tipo → etiqueta visible en la UI */
export const CATALOG_LABELS: Record<string, string> = {
  empresa:      'Empresas',
  tipo_equipo:  'Tipos de equipo',
  marca:        'Marcas',
  ubicacion:    'Ubicaciones',
  gerencia:     'Gerencias',
  departamento: 'Departamentos',
  ceco:         'Centros de costo',
};

/** Orden de aparición en la página Configuración */
export const CATALOG_ORDER = Object.keys(CATALOG_LABELS);
