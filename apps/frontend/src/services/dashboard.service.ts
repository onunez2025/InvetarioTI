import api from './api';

export const dashboardService = {
  resumen: () => api.get('/api/dashboard/resumen').then((r) => r.data),
  graficos: () => api.get('/api/dashboard/graficos').then((r) => r.data),
  eosProximos: () => api.get('/api/dashboard/eos-proximos').then((r) => r.data),
  actividadReciente: () => api.get('/api/dashboard/actividad-reciente').then((r) => r.data),
};
