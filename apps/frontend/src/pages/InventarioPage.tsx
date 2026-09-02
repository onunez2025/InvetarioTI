import { useState, useEffect } from 'react';
import { Table, Tabs, Tag, Spin } from 'antd';
import { InboxOutlined, LaptopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { inventarioService } from '../services/inventario.service';

type StockRow = {
  modeloId: number; modeloNombre: string; modeloCodigo: string; tipo: string;
  totalIngresado: number; asignado: number; disponible: number;
};
type EquipoRow = {
  modeloId: number; modeloNombre: string; modeloCodigo: string; tipo: string;
  total: number; activos: number; asignados: number; disponibles: number; bajas: number;
};

export default function InventarioPage() {
  const [tab, setTab] = useState('stock');
  const [stockData, setStockData] = useState<StockRow[]>([]);
  const [equiposData, setEquiposData] = useState<EquipoRow[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);

  useEffect(() => {
    setLoadingStock(true);
    inventarioService.stock().then(setStockData).catch(() => {}).finally(() => setLoadingStock(false));
    setLoadingEquipos(true);
    inventarioService.equiposPorModelo().then(setEquiposData).catch(() => {}).finally(() => setLoadingEquipos(false));
  }, []);

  const stockColumns: ColumnsType<StockRow> = [
    {
      title: 'Modelo', key: 'modelo',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.modeloNombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.modeloCodigo}</div>
        </div>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', render: (v) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : '—' },
    { title: 'Total ingresado', dataIndex: 'totalIngresado', align: 'right', render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Asignado', dataIndex: 'asignado', align: 'right' },
    {
      title: 'Disponible', dataIndex: 'disponible', align: 'right',
      render: (v: number) => {
        const color = v === 0 ? '#dc2626' : v <= 3 ? '#d97706' : '#16a34a';
        return <span style={{ fontWeight: 700, color }}>{v}</span>;
      },
    },
  ];

  const equiposColumns: ColumnsType<EquipoRow> = [
    {
      title: 'Modelo', key: 'modelo',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.modeloNombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.modeloCodigo}</div>
        </div>
      ),
    },
    { title: 'Tipo', dataIndex: 'tipo', render: (v) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : '—' },
    { title: 'Total', dataIndex: 'total', align: 'right', render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Activos', dataIndex: 'activos', align: 'right', render: (v) => <span style={{ color: '#16a34a', fontWeight: 600 }}>{v}</span> },
    { title: 'Asignados', dataIndex: 'asignados', align: 'right' },
    { title: 'Disponibles', dataIndex: 'disponibles', align: 'right', render: (v: number) => <span style={{ color: v > 0 ? '#2563eb' : '#94a3b8' }}>{v}</span> },
    { title: 'Bajas', dataIndex: 'bajas', align: 'right', render: (v) => v > 0 ? <span style={{ color: '#dc2626' }}>{v}</span> : <span style={{ color: '#94a3b8' }}>{v}</span> },
  ];

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Inventario</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Resumen de stock y equipos por modelo</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 24px 24px' }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'stock',
              label: <span><InboxOutlined style={{ marginRight: 6 }} />Stock periféricos</span>,
              children: loadingStock
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : (
                  <Table<StockRow>
                    dataSource={stockData}
                    columns={stockColumns}
                    rowKey="modeloId"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Sin datos de stock' }}
                  />
                ),
            },
            {
              key: 'equipos',
              label: <span><LaptopOutlined style={{ marginRight: 6 }} />Equipos por modelo</span>,
              children: loadingEquipos
                ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                : (
                  <Table<EquipoRow>
                    dataSource={equiposData}
                    columns={equiposColumns}
                    rowKey="modeloId"
                    size="small"
                    pagination={false}
                    locale={{ emptyText: 'Sin datos de equipos' }}
                  />
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
