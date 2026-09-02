import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, Spin, Tag, Table, message, Popconfirm } from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, LaptopOutlined, HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { colaboradoresService, asignacionesService } from '../services/asignaciones.service';
import type { Colaborador, Asignacion } from '../types/asignacion.types';
import { stockAsignacionesService } from '../services/stockAsignaciones.service';
import type { StockAsignacion } from '../types/stock-asignacion.types';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return dayjs(s).format('DD MMM YYYY');
}

function InfoRow({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 180, color: '#64748b', fontSize: 13, flexShrink: 0 }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>
        {value ?? <span style={{ color: '#94a3b8' }}>—</span>}
      </div>
    </div>
  );
}

/* ============================================================
   TAB DATOS GENERALES
   ============================================================ */
function TabDatosGenerales({ colaborador }: { colaborador: Colaborador }) {
  return (
    <div style={{ maxWidth: 700 }}>
      {/* Estado */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          background: colaborador.activo ? '#dcfce7' : '#fee2e2',
          color: colaborador.activo ? '#16a34a' : '#dc2626',
          padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        }}>
          ● {colaborador.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 20px', marginBottom: 20 }}>
        <InfoRow label="Nombre completo" value={colaborador.nombre} />
        <InfoRow label="DNI" value={colaborador.dni
          ? <code style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{colaborador.dni}</code>
          : null
        } />
        <InfoRow label="Email" value={colaborador.email} />
        <InfoRow label="Cargo" value={colaborador.cargo ? <Tag style={{ fontSize: 11 }}>{colaborador.cargo}</Tag> : null} />
        <InfoRow label="Gerencia" value={colaborador.gerencia} />
        <InfoRow label="Departamento" value={colaborador.departamento} />
      </div>
    </div>
  );
}

/* ============================================================
   TAB EQUIPOS ACTUALES
   ============================================================ */
function TabEquiposActuales({ colaboradorId }: { colaboradorId: number }) {
  const navigate = useNavigate();
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [perifericos, setPerifericos] = useState<StockAsignacion[]>([]);
  const [loadingPeri, setLoadingPeri] = useState(false);

  useEffect(() => {
    asignacionesService.findByColaborador(colaboradorId)
      .then(setAsignaciones)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [colaboradorId]);

  useEffect(() => {
    setLoadingPeri(true);
    stockAsignacionesService.porColaborador(colaboradorId, true)
      .then(setPerifericos)
      .catch(() => {})
      .finally(() => setLoadingPeri(false));
  }, [colaboradorId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  const equipoColumns: ColumnsType<Asignacion> = [
    {
      title: 'Equipo',
      key: 'equipo',
      render: (_, a) => (
        <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipos/${a.equipoId}`)}>
          <div style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{a.equipo.nombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {[a.equipo.tipo, a.equipo.marca, a.equipo.serie].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      title: 'Tipo',
      key: 'tipo',
      render: (_, a) => a.equipo.tipo ? <Tag style={{ fontSize: 11 }}>{a.equipo.tipo}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Desde',
      dataIndex: 'fechaInicio',
      render: (v) => <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(v)}</span>,
    },
    {
      title: 'Días',
      key: 'dias',
      render: (_, a) => {
        const dias = dayjs().diff(dayjs(a.fechaInicio), 'day');
        const color = dias > 365 ? '#dc2626' : dias > 180 ? '#d97706' : '#16a34a';
        return <span style={{ fontSize: 12, color, fontWeight: 600 }}>{dias}d</span>;
      },
    },
    {
      title: 'Ubicación',
      key: 'ubi',
      render: (_, a) => <span style={{ fontSize: 12, color: '#64748b' }}>{a.equipo.ubicacion ?? '—'}</span>,
    },
  ];

  return (
    <div>
      {asignaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <LaptopOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 16, display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Sin equipos asignados</div>
          <div style={{ fontSize: 13 }}>Este colaborador no tiene equipos activos actualmente.</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table<Asignacion>
            dataSource={asignaciones}
            columns={equipoColumns}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: 'Sin equipos activos' }}
          />
        </div>
      )}

      {/* ── Periféricos ── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Periféricos asignados
        </div>
        {loadingPeri ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
        ) : perifericos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
            Sin periféricos asignados
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Table<StockAsignacion>
              dataSource={perifericos}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Sin periféricos' }}
              columns={[
                {
                  title: 'Modelo', key: 'modelo',
                  render: (_, r) => (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.modelo?.nombre ?? `ID ${r.modeloId}`}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.modelo?.codigo}</div>
                    </div>
                  ),
                },
                { title: 'Tipo', key: 'tipo', render: (_, r) => r.modelo?.tipo ? <Tag style={{ fontSize: 11 }}>{r.modelo.tipo}</Tag> : '—' },
                { title: 'Cantidad', dataIndex: 'cantidad', align: 'right', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
                { title: 'Desde', dataIndex: 'fechaInicio', render: (v) => <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(v)}</span> },
                {
                  title: 'Días', key: 'dias',
                  render: (_, r) => {
                    const dias = dayjs().diff(dayjs(r.fechaInicio), 'day');
                    const color = dias > 365 ? '#dc2626' : dias > 180 ? '#d97706' : '#16a34a';
                    return <span style={{ fontSize: 12, color, fontWeight: 600 }}>{dias}d</span>;
                  },
                },
                {
                  title: '', key: 'devolver',
                  render: (_, r) => (
                    <Popconfirm
                      title="¿Devolver este periférico?"
                      onConfirm={async () => {
                        try {
                          await stockAsignacionesService.devolver(r.id, dayjs().format('YYYY-MM-DD'));
                          message.success('Periférico devuelto');
                          stockAsignacionesService.porColaborador(colaboradorId, true).then(setPerifericos).catch(() => {});
                        } catch { message.error('Error al devolver'); }
                      }}
                      okText="Devolver" cancelText="Cancelar"
                    >
                      <button style={{
                        border: '1.5px solid #e2e8f0', borderRadius: 6, background: '#fff',
                        cursor: 'pointer', color: '#64748b', padding: '3px 10px', fontSize: 12,
                      }}>
                        Devolver
                      </button>
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TAB HISTORIAL
   ============================================================ */
function TabHistorial({ colaboradorId }: { colaboradorId: number }) {
  const navigate = useNavigate();
  const [data, setData] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    asignacionesService.findHistorialByColaborador(colaboradorId)
      .then(setData)
      .catch(() => message.error('Error al cargar historial'))
      .finally(() => setLoading(false));
  }, [colaboradorId]);

  const columns: ColumnsType<Asignacion> = [
    {
      title: 'Equipo',
      key: 'equipo',
      render: (_, a) => (
        <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/equipos/${a.equipoId}`)}>
          <div style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{a.equipo.nombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {[a.equipo.tipo, a.equipo.marca, a.equipo.serie].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      title: 'Desde',
      dataIndex: 'fechaInicio',
      render: (v) => <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(v)}</span>,
      sorter: (a, b) => a.fechaInicio.localeCompare(b.fechaInicio),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Hasta',
      dataIndex: 'fechaFin',
      render: (v) => v
        ? <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(v)}</span>
        : <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Activo</span>,
    },
    {
      title: 'Duración',
      key: 'duracion',
      render: (_, a) => {
        const fin = a.fechaFin ? dayjs(a.fechaFin) : dayjs();
        return <span style={{ fontSize: 12, color: '#64748b' }}>{fin.diff(dayjs(a.fechaInicio), 'day')}d</span>;
      },
    },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Table<Asignacion>
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showTotal: t => `${t} asignaciones` }}
        locale={{ emptyText: 'Sin historial de asignaciones' }}
      />
    </div>
  );
}

/* ============================================================
   COLABORADOR DETAIL PAGE
   ============================================================ */
export default function ColaboradorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    colaboradoresService.findById(parseInt(id))
      .then(setColaborador)
      .catch(() => { message.error('Colaborador no encontrado'); navigate('/asignaciones'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!colaborador) return null;

  const initials = colaborador.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both', maxWidth: 900 }}>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <button
          className="it-btn"
          onClick={() => navigate('/asignaciones')}
          style={{ marginTop: 2 }}
        >
          <ArrowLeftOutlined /> Volver
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {colaborador.nombre}
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
              {[colaborador.cargo, colaborador.gerencia, colaborador.departamento].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="general"
        items={[
          {
            key: 'general',
            label: <span><UserOutlined style={{ marginRight: 6 }} />Datos generales</span>,
            children: <TabDatosGenerales colaborador={colaborador} />,
          },
          {
            key: 'equipos',
            label: <span><LaptopOutlined style={{ marginRight: 6 }} />Equipos actuales</span>,
            children: <TabEquiposActuales colaboradorId={colaborador.id} />,
          },
          {
            key: 'historial',
            label: <span><HistoryOutlined style={{ marginRight: 6 }} />Historial</span>,
            children: <TabHistorial colaboradorId={colaborador.id} />,
          },
        ]}
      />
    </div>
  );
}
