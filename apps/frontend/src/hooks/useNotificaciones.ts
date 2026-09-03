import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
}

export function useNotificaciones() {
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notificaciones');
      setNotis(res.data);
    } catch {
      // Silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  const marcarLeida = async (id: number) => {
    try {
      await api.patch(`/api/notificaciones/${id}/leer`);
      setNotis((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    } catch {
      // Silencioso
    }
  };

  const marcarTodas = async () => {
    try {
      await api.delete('/api/notificaciones/todas');
      setNotis((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60_000);
    return () => clearInterval(interval);
  }, [cargar]);

  return {
    notis,
    noLeidas: notis.filter((n) => !n.leida).length,
    marcarLeida,
    marcarTodas,
    cargar,
    loading,
  };
}
