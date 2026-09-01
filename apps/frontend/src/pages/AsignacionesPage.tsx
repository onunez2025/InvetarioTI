import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Modal, Form, Input, Select, DatePicker, message,
  Popconfirm, Tag, Tooltip, Tabs, Empty, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, UserDeleteOutlined,
  SwapOutlined, CheckCircleOutlined, HistoryOutlined,
  TeamOutlined, LaptopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { asignacionesService, colaboradoresService } from '../services/asignaciones.service';
import type { Asignacion, Colaborador } from '../types/asignacion.types';
import { equiposService } from '../services/equipos.service';
import type { Equipo } from '../types/equipo.types';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  return dayjs(s).format('DD MMM YYYY');
}

function ColabAvatar({ nombre }: { nombre: string }) {
  const ini = nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {ini}
    </div>
  );
}

/* ============================================================
   MODAL NUEVA ASIGNACIÓN
   ============================================================ */
function ModalAsignacion({
  open, onClose, onSaved, colaboradores, equipoIdInicial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  colaboradores: Colaborador[];
  equipoIdInicial?: number;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargandoEquipos, setCargandoEquipos] = useState(false);

  // Cargar todos los equipos al abrir el modal (evita depender del store paginado)
  useEffect(() => {
    if (open) {
      setCargandoEquipos(true);
      equiposService.listar({ limit: 1000 })
        .then(({ data }) => setEquipos(data))
        .catch(() => message.error('No se pudo cargar la lista de equipos'))
        .finally(() => setCargandoEquipos(false));

      form.resetFields();
      form.setFieldValue('fechaInicio', dayjs());
      if (equipoIdInicial) form.setFieldValue('equipoId', equipoIdInicial);
    }
  }, [open, equipoIdInicial, form]);

  const guardar = async (vals: any) => {
    setLoading(true);
    try {
      await asignacionesService.create({
        equipoId: vals.equipoId,
        colaboradorId: vals.colaboradorId,
        fechaInicio: vals.fechaInicio.format('YYYY-MM-DD'),
        observaciones: vals.observaciones,
      });
      message.success('Asignación registrada');
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? e.message ?? 'Error al asignar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<><SwapOutlined style={{ marginRight: 8, color: '#7c3aed' }} />Nueva asignación</>}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Asignar"
      cancelText="Cancelar"
      confirmLoading={loading}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={guardar} style={{ paddingTop: 8 }}>
        <Form.Item name="equipoId" label="Equipo" rules={[{ required: true, message: 'Selecciona un equipo' }]}>
          <Select
            showSearch
            loading={cargandoEquipos}
            placeholder={cargandoEquipos ? 'Cargando equipos...' : 'Buscar por nombre, serie o código...'}
            filterOption={(input, opt) =>
              (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={equipos.map(e => ({
              value: e.id,
              label: `${e.nombre}${e.serie ? ' · ' + e.serie : ''}${e.codigo ? ' · ' + e.codigo : ''}`,
            }))}
            disabled={!!equipoIdInicial}
          />
        </Form.Item>
        <Form.Item name="colaboradorId" label="Colaborador" rules={[{ required: true, message: 'Selecciona un colaborador' }]}>
          <Select
            showSearch
            placeholder="Buscar colaborador..."
            filterOption={(input, opt) =>
              (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={colaboradores
              .filter(c => c.activo)
              .map(c => ({
                value: c.id,
                label: `${c.nombre}${c.cargo ? ' — ' + c.cargo : ''}${c.departamento ? ' · ' + c.departamento : ''}`,
              }))
            }
          />
        </Form.Item>
        <Form.Item name="fechaInicio" label="Fecha de inicio" rules={[{ required: true }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="observaciones" label="Observaciones (opcional)">
          <Input.TextArea rows={2} placeholder="Notas sobre la asignación..." maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ============================================================
   MODAL DEVOLUCIÓN
   ============================================================ */
function ModalDevolucion({
  open, asignacion, onClose, onSaved,
}: {
  open: boolean;
  asignacion: Asignacion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldValue('fechaFin', dayjs());
    }
  }, [open, form]);

  const guardar = async (vals: any) => {
    if (!asignacion) return;
    setLoading(true);
    try {
      await asignacionesService.devolver(asignacion.id, {
        fechaFin: vals.fechaFin.format('YYYY-MM-DD'),
        observaciones: vals.observaciones,
      });
      message.success('Devolución registrada');
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<><CheckCircleOutlined style={{ marginRight: 8, color: '#16a34a' }} />Registrar devolución</>}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Confirmar devolución"
      cancelText="Cancelar"
      okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      confirmLoading={loading}
      width={420}
      destroyOnClose
    >
      {asignacion && (
        <div style={{
          background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
          marginBottom: 16, fontSize: 13, border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{asignacion.equipo.nombre}</div>
          <div style={{ color: '#64748b', marginTop: 2 }}>
            Asignado a <strong>{asignacion.colaborador.nombre}</strong> desde {fmtDate(asignacion.fechaInicio)}
          </div>
        </div>
      )}
      <Form form={form} layout="vertical" onFinish={guardar}>
        <Form.Item name="fechaFin" label="Fecha de devolución" rules={[{ required: true }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="observaciones" label="Observaciones (opcional)">
          <Input.TextArea rows={2} placeholder="Motivo de devolución, estado del equipo..." maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ============================================================
   MODAL COLABORADOR
   ============================================================ */
function ModalColaborador({
  open, colaborador, onClose, onSaved,
}: {
  open: boolean;
  colaborador: Colaborador | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (colaborador) {
        form.setFieldsValue({
          nombre: colaborador.nombre,
          dni: colaborador.dni,
          email: colaborador.email,
          cargo: colaborador.cargo,
          gerencia: colaborador.gerencia,
          departamento: colaborador.departamento,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, colaborador, form]);

  const guardar = async (vals: any) => {
    setLoading(true);
    try {
      if (colaborador) {
        await colaboradoresService.update(colaborador.id, vals);
        message.success('Colaborador actualizado');
      } else {
        await colaboradoresService.create(vals);
        message.success('Colaborador creado');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? e.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={colaborador ? `Editar: ${colaborador.nombre}` : 'Nuevo colaborador'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={loading}
      width={480}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={guardar} style={{ paddingTop: 8 }}>
        <Form.Item name="nombre" label="Nombre completo" rules={[{ required: true }]}>
          <Input placeholder="Ej: Juan Carlos Pérez" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="dni" label="DNI">
            <Input placeholder="12345678" maxLength={15} />
          </Form.Item>
          <Form.Item name="cargo" label="Cargo">
            <Input placeholder="Ej: Analista TI" />
          </Form.Item>
        </div>
        <Form.Item name="email" label="Correo electrónico">
          <Input placeholder="correo@empresa.com" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="gerencia" label="Gerencia">
            <Input placeholder="Ej: GAC" />
          </Form.Item>
          <Form.Item name="departamento" label="Departamento">
            <Input placeholder="Ej: Atención al Cliente" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

/* ============================================================
   TAB ASIGNACIONES ACTIVAS
   ============================================================ */
function TabActivas({
  activas, loading, onAsignar, onDevolver,
}: {
  activas: Asignacion[];
  loading: boolean;
  onAsignar: (equipoId?: number) => void;
  onDevolver: (a: Asignacion) => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return activas.filter(a =>
      a.equipo.nombre.toLowerCase().includes(q) ||
      a.colaborador.nombre.toLowerCase().includes(q) ||
      (a.equipo.serie ?? '').toLowerCase().includes(q) ||
      (a.colaborador.departamento ?? '').toLowerCase().includes(q),
    );
  }, [activas, busqueda]);

  const columns: ColumnsType<Asignacion> = [
    {
      title: 'Equipo',
      key: 'equipo',
      render: (_, a) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{a.equipo.nombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {[a.equipo.tipo, a.equipo.marca, a.equipo.serie].filter(Boolean).join(' · ')}
          </div>
        </div>
      ),
    },
    {
      title: 'Colaborador',
      key: 'colaborador',
      render: (_, a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColabAvatar nombre={a.colaborador.nombre} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.colaborador.nombre}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {[a.colaborador.cargo, a.colaborador.departamento].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Desde',
      dataIndex: 'fechaInicio',
      render: (v: string) => (
        <span style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(v)}</span>
      ),
      sorter: (a, b) => a.fechaInicio.localeCompare(b.fechaInicio),
    },
    {
      title: 'Días asignado',
      key: 'dias',
      render: (_, a) => {
        const dias = dayjs().diff(dayjs(a.fechaInicio), 'day');
        const color = dias > 365 ? '#dc2626' : dias > 180 ? '#d97706' : '#16a34a';
        return <span style={{ fontSize: 12, color, fontWeight: 600 }}>{dias}d</span>;
      },
      sorter: (a, b) =>
        dayjs().diff(dayjs(a.fechaInicio)) - dayjs().diff(dayjs(b.fechaInicio)),
    },
    {
      title: 'Área',
      key: 'area',
      render: (_, a) => {
        const area = a.equipo.gerencia || a.colaborador.gerencia;
        return area ? <Tag style={{ fontSize: 11 }}>{area}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>;
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 100,
      render: (_, a) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Nueva asignación para este equipo">
            <button className="it-btn" style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={() => onAsignar(a.equipoId)}>
              <SwapOutlined />
            </button>
          </Tooltip>
          <Tooltip title="Registrar devolución">
            <button
              className="it-btn"
              style={{ padding: '4px 8px', fontSize: 12, color: '#16a34a' }}
              onClick={() => onDevolver(a)}
            >
              <CheckCircleOutlined />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <Input.Search
          placeholder="Buscar equipo o colaborador..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
        <div style={{ flex: 1 }} />
        <button className="it-btn it-btn-primary" onClick={() => onAsignar()}>
          <PlusOutlined /> Nueva asignación
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table
          dataSource={filtradas}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} asignaciones activas` }}
          locale={{ emptyText: <Empty description="No hay equipos asignados" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   TAB HISTORIAL
   ============================================================ */
function TabHistorial() {
  const [data, setData] = useState<Asignacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const cargar = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await asignacionesService.findHistorial(p, PAGE_SIZE);
      setData(res.data);
      setTotal(res.total);
    } catch {
      message.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  const columns: ColumnsType<Asignacion> = [
    {
      title: 'Equipo',
      key: 'equipo',
      render: (_, a) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.equipo.nombre}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.equipo.serie}</div>
        </div>
      ),
    },
    {
      title: 'Colaborador',
      key: 'colaborador',
      render: (_, a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColabAvatar nombre={a.colaborador.nombre} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.colaborador.nombre}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{a.colaborador.cargo}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Período',
      key: 'periodo',
      render: (_, a) => (
        <div style={{ fontSize: 12, color: '#64748b' }}>
          <div>{fmtDate(a.fechaInicio)} → {fmtDate(a.fechaFin)}</div>
          <div style={{ color: '#94a3b8', marginTop: 2 }}>
            {dayjs(a.fechaFin!).diff(dayjs(a.fechaInicio), 'day')} días
          </div>
        </div>
      ),
    },
    {
      title: 'Observaciones',
      dataIndex: 'observaciones',
      render: (v?: string) => (
        <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showTotal: t => `${t} asignaciones históricas`,
          onChange: (p) => { setPage(p); cargar(p); },
        }}
        locale={{ emptyText: <Empty description="Sin historial aún" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </div>
  );
}

/* ============================================================
   TAB COLABORADORES
   ============================================================ */
function TabColaboradores({
  colaboradores, loading, onRefresh,
}: {
  colaboradores: Colaborador[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editColab, setEditColab] = useState<Colaborador | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return colaboradores.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.dni ?? '').includes(q) ||
      (c.cargo ?? '').toLowerCase().includes(q) ||
      (c.departamento ?? '').toLowerCase().includes(q),
    );
  }, [colaboradores, busqueda]);

  const desactivar = async (id: number) => {
    try {
      await colaboradoresService.deactivate(id);
      message.success('Colaborador desactivado');
      onRefresh();
    } catch (e: any) {
      message.error(e.message ?? 'Error');
    }
  };

  const columns: ColumnsType<Colaborador> = [
    {
      title: 'Colaborador',
      key: 'colaborador',
      render: (_, c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ColabAvatar nombre={c.nombre} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: c.activo ? '#0f172a' : '#94a3b8' }}>
              {c.nombre}
            </div>
            {c.email && <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.email}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'DNI',
      dataIndex: 'dni',
      render: (v?: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{v || '—'}</span>,
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      render: (v?: string) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Área',
      key: 'area',
      render: (_, c) => (
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {c.gerencia && <div>{c.gerencia}</div>}
          {c.departamento && <div style={{ color: '#94a3b8' }}>{c.departamento}</div>}
          {!c.gerencia && !c.departamento && '—'}
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      render: (v: boolean) => (
        <span style={{
          background: v ? '#dcfce7' : '#fee2e2',
          color: v ? '#16a34a' : '#dc2626',
          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        }}>
          {v ? '● Activo' : '● Inactivo'}
        </span>
      ),
      filters: [{ text: 'Activo', value: true }, { text: 'Inactivo', value: false }],
      onFilter: (v, r) => r.activo === v,
    },
    {
      title: '',
      key: 'acciones',
      width: 80,
      render: (_, c) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Editar">
            <button className="it-btn" style={{ padding: '4px 8px', fontSize: 12 }}
              onClick={() => { setEditColab(c); setModalOpen(true); }}>
              <EditOutlined />
            </button>
          </Tooltip>
          {c.activo && (
            <Tooltip title="Desactivar">
              <Popconfirm
                title="¿Desactivar colaborador?"
                onConfirm={() => desactivar(c.id)}
                okText="Sí" cancelText="No" okButtonProps={{ danger: true }}
              >
                <button className="it-btn" style={{ padding: '4px 8px', fontSize: 12, color: '#ef4444' }}>
                  <UserDeleteOutlined />
                </button>
              </Popconfirm>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar colaborador..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <div style={{ flex: 1 }} />
        <button
          className="it-btn it-btn-primary"
          onClick={() => { setEditColab(null); setModalOpen(true); }}
        >
          <PlusOutlined /> Nuevo colaborador
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table
          dataSource={filtrados}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} colaboradores` }}
          rowClassName={r => !r.activo ? 'row-inactive' : ''}
        />
      </div>

      <ModalColaborador
        open={modalOpen}
        colaborador={editColab}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
      />
      <style>{`.row-inactive td { opacity: 0.45; }`}</style>
    </div>
  );
}

/* ============================================================
   ASIGNACIONES PAGE
   ============================================================ */
export default function AsignacionesPage() {
  const [activas, setActivas] = useState<Asignacion[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loadingActivas, setLoadingActivas] = useState(false);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [tabActiva, setTabActiva] = useState('activas');

  // Modals
  const [modalAsig, setModalAsig] = useState(false);
  const [equipoIdInicial, setEquipoIdInicial] = useState<number | undefined>();
  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [asignacionDevolver, setAsignacionDevolver] = useState<Asignacion | null>(null);

  const cargarActivas = useCallback(async () => {
    setLoadingActivas(true);
    try {
      const data = await asignacionesService.findActivas();
      setActivas(data);
    } catch {
      message.error('Error al cargar asignaciones');
    } finally {
      setLoadingActivas(false);
    }
  }, []);

  const cargarColaboradores = useCallback(async () => {
    setLoadingColabs(true);
    try {
      const data = await colaboradoresService.findAll();
      setColaboradores(data);
    } catch {
      message.error('Error al cargar colaboradores');
    } finally {
      setLoadingColabs(false);
    }
  }, []);

  useEffect(() => {
    cargarActivas();
    cargarColaboradores();
  }, [cargarActivas, cargarColaboradores]);

  const handleAsignar = (equipoId?: number) => {
    setEquipoIdInicial(equipoId);
    setModalAsig(true);
  };

  const handleDevolver = (a: Asignacion) => {
    setAsignacionDevolver(a);
    setModalDevolucion(true);
  };

  const onAsignado = () => {
    cargarActivas();
    // Si estamos en historial, no hay que refrescar activas doble
  };

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            <SwapOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Asignaciones
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13, marginTop: 2 }}>
              {loadingActivas ? (
                <Spin size="small" />
              ) : (
                <>
                  <strong>{activas.length}</strong> equipo{activas.length !== 1 ? 's' : ''} asignado{activas.length !== 1 ? 's' : ''}
                  {' · '}
                  <strong>{colaboradores.filter(c => c.activo).length}</strong> colaboradores activos
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={tabActiva}
        onChange={setTabActiva}
        items={[
          {
            key: 'activas',
            label: (
              <span>
                <LaptopOutlined style={{ marginRight: 6 }} />
                Activas
                {activas.length > 0 && (
                  <span style={{
                    marginLeft: 6, background: '#7c3aed', color: '#fff',
                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                  }}>
                    {activas.length}
                  </span>
                )}
              </span>
            ),
            children: (
              <TabActivas
                activas={activas}
                loading={loadingActivas}
                onAsignar={handleAsignar}
                onDevolver={handleDevolver}
              />
            ),
          },
          {
            key: 'historial',
            label: <span><HistoryOutlined style={{ marginRight: 6 }} />Historial</span>,
            children: <TabHistorial />,
          },
          {
            key: 'colaboradores',
            label: (
              <span>
                <TeamOutlined style={{ marginRight: 6 }} />
                Colaboradores
                {colaboradores.length > 0 && (
                  <span style={{
                    marginLeft: 6, background: '#e2e8f0', color: '#64748b',
                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                  }}>
                    {colaboradores.filter(c => c.activo).length}
                  </span>
                )}
              </span>
            ),
            children: (
              <TabColaboradores
                colaboradores={colaboradores}
                loading={loadingColabs}
                onRefresh={cargarColaboradores}
              />
            ),
          },
        ]}
      />

      {/* Modals */}
      <ModalAsignacion
        open={modalAsig}
        onClose={() => { setModalAsig(false); setEquipoIdInicial(undefined); }}
        onSaved={onAsignado}
        colaboradores={colaboradores}
        equipoIdInicial={equipoIdInicial}
      />
      <ModalDevolucion
        open={modalDevolucion}
        asignacion={asignacionDevolver}
        onClose={() => setModalDevolucion(false)}
        onSaved={cargarActivas}
      />
    </div>
  );
}
