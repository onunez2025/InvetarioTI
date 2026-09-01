import api from './api';

export const inventarioService = {
  stock:            () => api.get('/api/inventario/stock').then(r => r.data),
  equiposPorModelo: () => api.get('/api/inventario/equipos-por-modelo').then(r => r.data),
};
