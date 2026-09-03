import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs, Spin, Tag, Table, message, Tooltip, Button, Modal,
  Form, Select, DatePicker, Input, InputNumber, Typography,
} from 'antd';
import {
  ArrowLeftOutlined, LaptopOutlined, SwapOutlined,
  HistoryOutlined, CheckCircleOutlined, QrcodeOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { equiposService } from '../services/equipos.service';
import { asignacionesService } from '../services/asignaciones.service';
import type { Equipo } from '../types/equipo.types';
import type { Asignacion } from '../types/asignacion.types';

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
   TAB GENERAL
   ============================================================ */
function TabGeneral({ equipo }: { equipo: Equipo }) {
  const estadoColor: Record<string, string> = {
    ACTIVO: '#dcfce7', BAJA: '#fee2e2', MANTENIMIENTO: '#fef9c3',
  };
  const estadoText: Record<string, string> = {
    ACTIVO: '#16a34a', BAJA: '#dc2626', MANTENIMIENTO: '#ca8a04',
  };

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Estado badge */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          background: estadoColor[equipo.estado] ?? '#f1f5f9',
          color: estadoText[equipo.estado] ?? '#64748b',
          padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        }}>
          ● {equipo.estado}
        </span>
      </div>

      {/* Identificación */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Identificación
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 20px', marginBottom: 20 }}>
        <InfoRow label="Nombre / Alias" value={equipo.nombre} />
        <InfoRow label="Tipo" value={equipo.modelo?.tipo ? <Tag style={{ fontSize: 11 }}>{equipo.modelo.tipo}</Tag> : null} />
        <InfoRow label="Marca" value={equipo.modelo?.marca} />
        <InfoRow label="Modelo" value={equipo.modelo?.nombre} />
        <InfoRow label="Código modelo" value={equipo.modelo?.codigo} />
        <InfoRow label="Número de serie" value={<code style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{equipo.serie ?? '—'}</code>} />
        <InfoRow label="Código activo" value={equipo.codigo} />
        <InfoRow label="Empresa" value={equipo.empresa} />
      </div>

      {/* Ubicación */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Ubicación
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 20px', marginBottom: 20 }}>
        <InfoRow label="Ubicación física" value={equipo.ubicacion} />
        <InfoRow label="Gerencia" value={equipo.gerencia} />
        <InfoRow label="Departamento" value={equipo.departamento} />
        <InfoRow label="Centro de costo" value={equipo.ceco} />
      </div>

      {/* Software / Fechas */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        Software y ciclo de vida
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 20px', marginBottom: 20 }}>
        <InfoRow label="Firmware" value={equipo.modelo?.firmwareRef} />
        <InfoRow label="End of Sale" value={equipo.modelo?.endOfSale ? fmtDate(equipo.modelo.endOfSale) : null} />
        <InfoRow label="End of Support" value={
          equipo.modelo?.endOfSupport ? (
            (() => {
              const dias = dayjs(equipo.modelo.endOfSupport).diff(dayjs(), 'day');
              const color = dias < 0 ? '#dc2626' : dias < 180 ? '#d97706' : '#16a34a';
              return <span style={{ color, fontWeight: 600 }}>{fmtDate(equipo.modelo.endOfSupport)}{dias < 0 ? ' · Vencido' : dias < 180 ? ` · ${dias}d` : ''}</span>;
            })()
          ) : null
        } />
        <InfoRow label="Registrado" value={fmtDate(equipo.creadoEn)} />
        <InfoRow label="Actualizado" value={fmtDate(equipo.actualizadoEn)} />
      </div>
    </div>
  );
}

/* ============================================================
   TAB ASIGNACIÓN ACTUAL
   ============================================================ */
function TabAsignacionActual({ equipoId }: { equipoId: number }) {
  const navigate = useNavigate();
  const [asignacion, setAsignacion] = useState<Asignacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    asignacionesService.findActivaByEquipo(equipoId)
      .then(setAsignacion)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [equipoId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  if (!asignacion) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e', marginBottom: 16, display: 'block' }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Disponible</div>
        <div style={{ fontSize: 13 }}>Este equipo no tiene ninguna asignación activa.</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 20px', marginBottom: 16 }}>
        {/* Colaborador */}
        <div style={{ padding: '16px 0 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Colaborador asignado
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => navigate(`/colaboradores/${asignacion.colaboradorId}`)}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              {asignacion.colaborador.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 15 }}>
                {asignacion.colaborador.nombre}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {[asignacion.colaborador.cargo, asignacion.colaborador.gerencia].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        </div>
        <InfoRow label="Desde" value={fmtDate(asignacion.fechaInicio)} />
        <InfoRow label="Días asignado" value={
          <span style={{ fontWeight: 600 }}>
            {dayjs().diff(dayjs(asignacion.fechaInicio), 'day')} días
          </span>
        } />
        {asignacion.observaciones && <InfoRow label="Observaciones" value={asignacion.observaciones} />}
      </div>
    </div>
  );
}

/* ============================================================
   TAB HISTORIAL ASIGNACIONES (CADENA DE CUSTODIA)
   ============================================================ */
function TabHistorial({ equipoId }: { equipoId: number }) {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    equiposService.historial(equipoId)
      .then((res: any[]) => {
        if (Array.isArray(res) && res.length > 0) {
          setData(res);
        } else {
          return asignacionesService.findByEquipo(equipoId).then(setData);
        }
      })
      .catch(() => {
        asignacionesService.findByEquipo(equipoId)
          .then(setData)
          .catch(() => message.error('Error al cargar historial'));
      })
      .finally(() => setLoading(false));
  }, [equipoId]);

  const columns: ColumnsType<any> = [
    {
      title: 'Colaborador',
      key: 'colaborador',
      render: (_, a) => {
        const nombre = a.colaborador?.nombre ?? a.colaborador ?? '—';
        const colId = a.colaboradorId ?? a.colaborador_id;
        return (
          <span
            style={{ color: '#2563eb', cursor: colId ? 'pointer' : 'default', fontWeight: 500 }}
            onClick={() => colId && navigate(`/colaboradores/${colId}`)}
          >
            {nombre}
          </span>
        );
      },
    },
    {
      title: 'Área / Gerencia',
      key: 'area',
      render: (_, a) => {
        const parts = [a.gerencia ?? a.colaborador?.gerencia, a.departamento ?? a.colaborador?.departamento].filter(Boolean);
        return <span style={{ fontSize: 12, color: '#64748b' }}>{parts.length ? parts.join(' · ') : '—'}</span>;
      },
    },
    {
      title: 'Desde',
      key: 'desde',
      render: (_, a) => <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(a.fechaInicio ?? a.fecha_asignacion)}</span>,
    },
    {
      title: 'Hasta',
      key: 'hasta',
      render: (_, a) => {
        const fin = a.fechaFin ?? a.fecha_devolucion;
        return fin ? (
          <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(fin)}</span>
        ) : (
          <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
            Activo
          </span>
        );
      },
    },
    {
      title: 'Duración',
      key: 'duracion',
      render: (_, a) => {
        if (a.dias != null) return <span style={{ fontSize: 12, color: '#64748b' }}>{a.dias}d</span>;
        const inicio = a.fechaInicio ?? a.fecha_asignacion;
        const fin = (a.fechaFin ?? a.fecha_devolucion) ? dayjs(a.fechaFin ?? a.fecha_devolucion) : dayjs();
        const dias = inicio ? fin.diff(dayjs(inicio), 'day') : '—';
        return <span style={{ fontSize: 12, color: '#64748b' }}>{dias}d</span>;
      },
    },
    {
      title: 'Registrado por',
      key: 'registradoPor',
      render: (_, a) => <span style={{ fontSize: 12, color: '#64748b' }}>{a.registradoPor ?? a.usuario?.nombre ?? '—'}</span>,
    },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(r, idx) => r.id ?? String(idx)}
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} asignaciones` }}
        locale={{ emptyText: 'Sin historial de custodia' }}
      />
    </div>
  );
}

/* ============================================================
   TAB MANTENIMIENTOS
   ============================================================ */
interface MantenimientoItem {
  id: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string | null;
  tecnico?: string;
  descripcion?: string;
  costo?: number;
  resultado?: string;
}

function TabMantenimientos({
  equipoId,
  onCambio,
}: {
  equipoId: number;
  onCambio?: () => void;
}) {
  const [data, setData] = useState<MantenimientoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargar = () => {
    setLoading(true);
    equiposService
      .mantenimientos(equipoId)
      .then(setData)
      .catch(() => message.error('Error al cargar mantenimientos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, [equipoId]);

  const onFinish = async (values: any) => {
    setGuardando(true);
    try {
      await equiposService.crearMantenimiento(equipoId, {
        tipo: values.tipo,
        fechaInicio: values.fechaInicio.format('YYYY-MM-DD'),
        fechaFin: values.fechaFin ? values.fechaFin.format('YYYY-MM-DD') : null,
        tecnico: values.tecnico,
        descripcion: values.descripcion,
        costo: values.costo,
        resultado: values.resultado,
      });
      message.success('Mantenimiento registrado correctamente');
      setModalAbierto(false);
      form.resetFields();
      cargar();
      if (onCambio) onCambio();
    } catch {
      message.error('Error al registrar mantenimiento');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<MantenimientoItem> = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo: string) => {
        const color =
          tipo === 'CORRECTIVO' ? 'red' : tipo === 'PREVENTIVO' ? 'blue' : 'gold';
        return <Tag color={color}>{tipo}</Tag>;
      },
    },
    {
      title: 'Fecha Inicio',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      render: (v) => fmtDate(v),
    },
    {
      title: 'Fecha Fin',
      dataIndex: 'fechaFin',
      key: 'fechaFin',
      render: (v) => (v ? fmtDate(v) : <Tag color="processing">En curso</Tag>),
    },
    {
      title: 'Técnico',
      dataIndex: 'tecnico',
      key: 'tecnico',
      render: (v) => v ?? '—',
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      render: (v) => (v != null ? `S/ ${Number(v).toFixed(2)}` : '—'),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <span>
              {v.slice(0, 35)}
              {v.length > 35 ? '…' : ''}
            </span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: 'Resultado',
      dataIndex: 'resultado',
      key: 'resultado',
      render: (v) => v ?? '—',
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Text type="secondary">
          Registro de mantenimientos e intervenciones técnicas.
        </Typography.Text>
        <Button
          type="primary"
          icon={<ToolOutlined />}
          onClick={() => {
            form.resetFields();
            setModalAbierto(true);
          }}
        >
          Registrar mantenimiento
        </Button>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Table<MantenimientoItem>
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'Sin mantenimientos registrados' }}
        />
      </div>

      <Modal
        title="Registrar mantenimiento"
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        onOk={() => form.submit()}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="tipo"
            label="Tipo"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
            initialValue="PREVENTIVO"
          >
            <Select placeholder="Seleccionar tipo">
              <Select.Option value="PREVENTIVO">Preventivo</Select.Option>
              <Select.Option value="CORRECTIVO">Correctivo</Select.Option>
              <Select.Option value="GARANTIA">Garantía</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="fechaInicio"
            label="Fecha inicio"
            rules={[{ required: true, message: 'Seleccione fecha inicio' }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="fechaFin"
            label="Fecha fin (opcional, dejar vacío si el equipo está en curso)"
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="tecnico" label="Técnico / Proveedor">
            <Input placeholder="Ej. Juan Pérez o Servicio Oficial" />
          </Form.Item>

          <Form.Item name="costo" label="Costo (S/)">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="0.00" />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción de la intervención">
            <Input.TextArea rows={3} placeholder="Detalles de la falla, cambio de piezas o mantenimiento realizado..." />
          </Form.Item>

          <Form.Item name="resultado" label="Resultado / Diagnóstico">
            <Input placeholder="Ej. Disco reemplazado, mantenimiento preventivo completado" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ============================================================
   EQUIPO DETAIL PAGE
   ============================================================ */
export default function EquipoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    if (!id) return;
    equiposService
      .obtener(parseInt(id))
      .then(setEquipo)
      .catch(() => {
        message.error('Equipo no encontrado');
        navigate('/equipos');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!equipo) return null;

  const tipoColor: Record<string, string> = {
    LAPTOP: '#dbeafe', PC: '#ede9fe', SWITCH: '#dcfce7', SERVIDOR: '#fef3c7',
    CAMERA: '#fce7f3', IMPRESORA: '#f0fdf4',
  };

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both', maxWidth: 900 }}>
      {/* Back + Header + QR Button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <button
            className="it-btn"
            onClick={() => navigate('/equipos')}
            style={{ marginTop: 2 }}
          >
            <ArrowLeftOutlined /> Volver
          </button>
          <div style={{
            width: 52, height: 52,
            background: tipoColor[equipo.modelo?.tipo?.toUpperCase() ?? ''] ?? '#f1f5f9',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            <LaptopOutlined style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
              {equipo.nombre}
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 13 }}>
              {[equipo.modelo?.tipo, equipo.modelo?.marca, equipo.modelo?.nombre].filter(Boolean).join(' · ')}
              {equipo.serie && (
                <> · <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{equipo.serie}</code></>
              )}
            </p>
          </div>
        </div>

        {/* Botón Etiqueta QR */}
        <Button
          icon={<QrcodeOutlined />}
          onClick={() => {
            const baseUrl = import.meta.env.VITE_API_URL ?? '';
            window.open(`${baseUrl}/api/equipos/${equipo.id}/qr-label`);
          }}
        >
          Etiqueta QR
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="general"
        items={[
          {
            key: 'general',
            label: <span><LaptopOutlined style={{ marginRight: 6 }} />General</span>,
            children: <TabGeneral equipo={equipo} />,
          },
          {
            key: 'asignacion',
            label: <span><SwapOutlined style={{ marginRight: 6 }} />Asignación actual</span>,
            children: <TabAsignacionActual equipoId={equipo.id} />,
          },
          {
            key: 'historial',
            label: <span><HistoryOutlined style={{ marginRight: 6 }} />Historial</span>,
            children: <TabHistorial equipoId={equipo.id} />,
          },
          {
            key: 'mantenimientos',
            label: <span><ToolOutlined style={{ marginRight: 6 }} />Mantenimientos</span>,
            children: <TabMantenimientos equipoId={equipo.id} onCambio={cargar} />,
          },
        ]}
      />
    </div>
  );
}
