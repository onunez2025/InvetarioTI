import { Table, Input, Select, Tooltip, Typography } from 'antd';
import {
  EditOutlined, StopOutlined, SearchOutlined, ReloadOutlined, FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { Equipo, FiltrosEquipos } from '../../types/equipo.types';

const { Text } = Typography;

/* ---- Status badge ---- */
const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  ACTIVO:        { cls: 'eq-badge eq-badge-activo',        label: 'Activo' },
  BAJA:          { cls: 'eq-badge eq-badge-baja',          label: 'Baja' },
  MANTENIMIENTO: { cls: 'eq-badge eq-badge-mantenimiento', label: 'Mantenimiento' },
};

function StatusBadge({ estado }: { estado: string }) {
  const cfg = STATUS_MAP[estado] ?? { cls: 'eq-badge', label: estado };
  return (
    <span className={cfg.cls} aria-label={`Estado: ${cfg.label}`}>
      <span className="eq-badge-dot" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

/* ---- Tipo badge ---- */
const TIPO_CLS: Record<string, string> = {
  LAPTOP:        'eq-tipo-badge eq-tipo-laptop',
  PC:            'eq-tipo-badge eq-tipo-pc',
  SERVIDOR:      'eq-tipo-badge eq-tipo-servidor',
  SWITCH:        'eq-tipo-badge eq-tipo-switch',
  ROUTER:        'eq-tipo-badge eq-tipo-router',
  'ACCESS POINT':'eq-tipo-badge eq-tipo-router',
};

function TipoBadge({ tipo }: { tipo?: string }) {
  if (!tipo) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
  const cls = TIPO_CLS[tipo.toUpperCase()] ?? 'eq-tipo-badge eq-tipo-default';
  return <span className={cls}>{tipo}</span>;
}

/* ---- Fin de soporte cell ---- */
function FechaFinSoporte({ fecha }: { fecha?: string }) {
  if (!fecha) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
  const d    = new Date(fecha);
  const dias = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const label = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  if (dias < 0) {
    return (
      <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
        <span style={{ marginRight: 4 }}>⚠</span>{label}
      </span>
    );
  }
  if (dias < 180) {
    return (
      <span style={{ color: '#d97706', fontSize: 12, fontWeight: 600 }}>
        <span style={{ marginRight: 4 }}>⏰</span>{label}
      </span>
    );
  }
  return <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>;
}

/* ---- Props ---- */
const TIPOS = [
  'SWITCH', 'SERVIDOR', 'PC', 'LAPTOP', 'ROUTER',
  'ACCESS POINT', 'FIREWALL', 'UPS', 'IMPRESORA', 'OTRO',
];

interface Props {
  equipos: Equipo[];
  total: number;
  cargando: boolean;
  filtros: FiltrosEquipos;
  rolUsuario: string;
  onFiltrar: (f: Partial<FiltrosEquipos>) => void;
  onEditar: (equipo: Equipo) => void;
  onEliminar: (id: number) => void;
  onRecargar: () => void;
  selectedKeys?: number[];
  onSelectChange?: (keys: number[]) => void;
}

export default function TablaEquipos({
  equipos, total, cargando, filtros, rolUsuario,
  onFiltrar, onEditar, onEliminar, onRecargar,
  selectedKeys, onSelectChange,
}: Props) {
  const navigate = useNavigate();
  const puedeEditar   = ['ADMIN', 'TI_ADMIN', 'TECNICO'].includes(rolUsuario);
  const puedeEliminar = ['ADMIN', 'TI_ADMIN'].includes(rolUsuario);

  const columnas: ColumnsType<Equipo> = [
    {
      title: 'Equipo',
      key: 'equipo',
      width: 220,
      ellipsis: true,
      render: (_: unknown, r: Equipo) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, lineHeight: 1.3 }}>{r.nombre}</div>
          {r.modelo && (
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{r.modelo.marca ? `${r.modelo.marca} · ` : ''}{r.modelo.nombre}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (v: string) => <TipoBadge tipo={v} />,
    },
    {
      title: 'Empresa / Depto.',
      key: 'empresa',
      width: 170,
      ellipsis: true,
      render: (_: unknown, r: Equipo) => (
        <div>
          <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{r.empresa}</div>
          {r.departamento && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{r.departamento}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacion',
      key: 'ubicacion',
      width: 140,
      ellipsis: true,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'N° Serie',
      dataIndex: 'serie',
      key: 'serie',
      width: 140,
      render: (v: string) => v
        ? <span className="col-serie">{v}</span>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 130,
      render: (v: string) => <StatusBadge estado={v} />,
    },
    {
      title: 'Fin soporte',
      dataIndex: 'endOfSupport',
      key: 'endOfSupport',
      width: 130,
      render: (fecha: string) => <FechaFinSoporte fecha={fecha} />,
    },
    {
      title: '',
      key: 'acciones',
      fixed: 'right',
      width: 80,
      render: (_: unknown, record: Equipo) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {puedeEditar && (
            <Tooltip title="Editar equipo">
              <button
                onClick={(e) => { e.stopPropagation(); onEditar(record); }}
                aria-label={`Editar ${record.nombre}`}
                style={{
                  width: 30, height: 30,
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 7,
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#3b82f6';
                  el.style.color = '#2563eb';
                  el.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#e2e8f0';
                  el.style.color = '#64748b';
                  el.style.background = '#fff';
                }}
              >
                <EditOutlined aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {puedeEliminar && record.estado !== 'BAJA' && (
            <Tooltip title="Dar de baja">
              <button
                onClick={(e) => { e.stopPropagation(); onEliminar(record.id); }}
                aria-label={`Dar de baja ${record.nombre}`}
                style={{
                  width: 30, height: 30,
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 7,
                  background: '#fff',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#ef4444';
                  el.style.color = '#dc2626';
                  el.style.background = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = '#e2e8f0';
                  el.style.color = '#64748b';
                  el.style.background = '#fff';
                }}
              >
                <StopOutlined aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px 12px 0 0',
        borderBottom: 'none',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <FilterOutlined style={{ color: '#94a3b8', fontSize: 14 }} aria-hidden="true" />
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginRight: 4 }}>Filtros:</span>

        <Input.Search
          placeholder="Buscar nombre, serie..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          allowClear
          style={{ width: 220, borderRadius: 8 }}
          defaultValue={filtros.busqueda}
          onSearch={(v) => onFiltrar({ busqueda: v || undefined, page: 1 })}
          size="small"
        />

        <Select
          placeholder="Tipo"
          allowClear
          style={{ width: 150 }}
          value={filtros.tipo}
          onChange={(v) => onFiltrar({ tipo: v, page: 1 })}
          options={TIPOS.map((t) => ({ value: t, label: t }))}
          size="small"
        />

        <Select
          placeholder="Estado"
          allowClear
          style={{ width: 150 }}
          value={filtros.estado}
          onChange={(v) => onFiltrar({ estado: v, page: 1 })}
          options={[
            { value: 'ACTIVO',        label: '🟢 Activo' },
            { value: 'MANTENIMIENTO', label: '🟡 Mantenimiento' },
            { value: 'BAJA',          label: '🔴 Baja' },
          ]}
          size="small"
        />

        <div style={{ marginLeft: 'auto' }}>
          <Tooltip title="Recargar datos">
            <button
              onClick={onRecargar}
              aria-label="Recargar datos"
              style={{
                width: 30, height: 30,
                border: '1.5px solid #e2e8f0',
                borderRadius: 7,
                background: '#fff',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
              }}
            >
              <ReloadOutlined aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Table */}
      <Table<Equipo>
        columns={columnas}
        dataSource={equipos}
        rowKey="id"
        loading={cargando}
        rowSelection={
          onSelectChange
            ? {
                selectedRowKeys: selectedKeys ?? [],
                onChange: (keys) => onSelectChange(keys as number[]),
              }
            : undefined
        }
        scroll={{ x: 1100 }}
        size="small"
        style={{ borderRadius: '0 0 12px 12px' }}
        onRow={(record) => ({
          onClick: () => navigate(`/equipos/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current:   filtros.page ?? 1,
          pageSize:  filtros.limit ?? 50,
          total,
          showTotal: (t) => (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {t.toLocaleString('es-PE')} equipo{t !== 1 ? 's' : ''}
            </span>
          ),
          showSizeChanger: true,
          pageSizeOptions: ['25', '50', '100'],
          onChange: (page, limit) => onFiltrar({ page, limit }),
          style: { padding: '12px 16px' },
        }}
      />
    </div>
  );
}
