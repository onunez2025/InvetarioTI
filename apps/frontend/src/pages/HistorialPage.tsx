import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Select, DatePicker, Tag, Tooltip, message } from 'antd';
import { HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const { RangePicker } = DatePicker;
const { Option } = Select;

interface HistorialEntry {
  id: number;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  fecha: string;
  equipo: { id: number; nombre: string; empresa: string };
  usuario: { id: number; nombre: string; email: string } | null;
}

interface HistorialResponse {
  data: HistorialEntry[];
  total: number;
}

const CAMPOS_ES: Record<string, string> = {
  nombre: 'Nombre', empresa: 'Empresa', gerencia: 'Gerencia', departamento: 'Departamento',
  ubicacion: 'Ubicación', tipo: 'Tipo', marca: 'Marca', modelo: 'Modelo', serie: 'N/S',
  firmware: 'Firmware', version: 'Versión', endOfSale: 'End of Sale',
  endOfSupport: 'End of Support', estado: 'Estado', codigo: 'Código', ceco: 'CECO',
};

const ESTADO_COLORS: Record<string, string> = {
  ACTIVO: '#16a34a', BAJA: '#dc2626', MANTENIMIENTO: '#d97706',
};

function formatFecha(iso: string) {
  return dayjs(iso).format('DD MMM YYYY, HH:mm');
}

function ValorCell({ value, campo }: { value: string; campo: string }) {
  if (!value || value === 'null' || value === 'undefined') {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>vacío</span>;
  }
  if (campo === 'estado') {
    return (
      <span style={{
        background: (ESTADO_COLORS[value] ?? '#64748b') + '18',
        color: ESTADO_COLORS[value] ?? '#64748b',
        border: `1px solid ${(ESTADO_COLORS[value] ?? '#64748b')}33`,
        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      }}>
        {value}
      </span>
    );
  }
  return <span style={{ fontSize: 12 }}>{value}</span>;
}

async function fetchHistorial(params: Record<string, string | number | undefined>): Promise<HistorialResponse> {
  const token = localStorage.getItem('access_token');
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const res = await fetch(`/api/historial?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al cargar historial');
  return res.json();
}

export default function HistorialPage() {
  const [data, setData] = useState<HistorialEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [campo, setCampo] = useState<string | undefined>();
  const [rango, setRango] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const cargar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page: p, limit: 50,
        campo: campo || undefined,
        fechaDesde: rango ? rango[0].format('YYYY-MM-DD') : undefined,
        fechaHasta: rango ? rango[1].format('YYYY-MM-DD') : undefined,
      };
      const res = await fetchHistorial(params);
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error('No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [campo, rango]);

  useEffect(() => { setPage(1); cargar(1); }, [cargar]);

  const filtradosLocal = busqueda.trim()
    ? data.filter(e =>
        e.equipo?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.usuario?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        CAMPOS_ES[e.campo]?.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : data;

  const columns: ColumnsType<HistorialEntry> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: 160,
      render: (v: string) => (
        <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>{formatFecha(v)}</span>
      ),
    },
    {
      title: 'Equipo',
      key: 'equipo',
      render: (_: unknown, r: HistorialEntry) => r.equipo ? (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.equipo.nombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.equipo.empresa}</div>
        </div>
      ) : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Campo',
      dataIndex: 'campo',
      width: 130,
      render: (v: string) => (
        <Tag style={{ fontSize: 11, margin: 0 }}>{CAMPOS_ES[v] ?? v}</Tag>
      ),
    },
    {
      title: 'Antes',
      dataIndex: 'valorAnterior',
      render: (v: string, r: HistorialEntry) => (
        <ValorCell value={v} campo={r.campo} />
      ),
    },
    {
      title: '→',
      key: 'arrow',
      width: 28,
      render: () => <span style={{ color: '#94a3b8', fontSize: 16 }}>→</span>,
    },
    {
      title: 'Después',
      dataIndex: 'valorNuevo',
      render: (v: string, r: HistorialEntry) => (
        <ValorCell value={v} campo={r.campo} />
      ),
    },
    {
      title: 'Modificado por',
      key: 'usuario',
      render: (_: unknown, r: HistorialEntry) => r.usuario ? (
        <Tooltip title={r.usuario.email}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{r.usuario.nombre}</span>
        </Tooltip>
      ) : <span style={{ color: '#94a3b8' }}>Sistema</span>,
    },
  ];

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            <HistoryOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Historial de cambios
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13, marginTop: 2 }}>
              Registro de todas las modificaciones realizadas a los equipos
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background: '#fff', borderRadius: '14px 14px 0 0',
        border: '1px solid #e2e8f0', borderBottom: 'none',
        padding: '14px 16px',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Input
          placeholder="Buscar equipo o usuario..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          placeholder="Campo modificado"
          allowClear
          value={campo}
          onChange={v => setCampo(v)}
          style={{ width: 180 }}
        >
          {Object.entries(CAMPOS_ES).map(([k, v]) => (
            <Option key={k} value={k}>{v}</Option>
          ))}
        </Select>
        <RangePicker
          value={rango as any}
          onChange={v => setRango(v as any)}
          format="DD/MM/YYYY"
          placeholder={['Fecha inicio', 'Fecha fin']}
          style={{ width: 240 }}
        />
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
          {total} registros totales
        </span>
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table
          dataSource={filtradosLocal}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: 50,
            total,
            onChange: (p) => { setPage(p); cargar(p); },
            showTotal: (t) => `${t} cambios`,
            showSizeChanger: false,
          }}
        />
      </div>
    </div>
  );
}
