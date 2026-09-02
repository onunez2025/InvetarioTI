import { useAuthStore } from '../store/authStore';

function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

async function descargar(path: string, filename: string, params?: Record<string, string>) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  const token = useAuthStore.getState().token ?? localStorage.getItem('access_token');
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  const res = await fetch(`${baseUrl}/api${path}${q}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error('Error al generar reporte');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reportesService = {
  equipos: (params?: Record<string, string>) =>
    descargar('/reportes/equipos', `equipos-${hoy()}.xlsx`, params),
  eos: () => descargar('/reportes/eos', `eos-${hoy()}.xlsx`),
  porGerencia: () => descargar('/reportes/por-gerencia', `por-gerencia-${hoy()}.xlsx`),
  asignacionesActivas: () =>
    descargar('/reportes/asignaciones-activas', `asignaciones-${hoy()}.xlsx`),
};
