import { useState, useEffect, useCallback } from 'react';
import {
  Table, Modal, Form, Input, Select, message, Popconfirm, Tag, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, UserDeleteOutlined, TeamOutlined, LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UsuarioItem, CreateUsuarioPayload, UpdateUsuarioPayload } from '../types/usuario.types';
import { ROL_LABELS, ROL_COLORS } from '../types/usuario.types';
import { usuariosService } from '../services/usuarios.service';
import { useAuthStore } from '../store/authStore';

const { Option } = Select;
const ROLES = ['ADMIN', 'GERENTE', 'TECNICO', 'VISUALIZADOR'] as const;

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Initials({ nombre }: { nombre: string }) {
  const ini = nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {ini}
    </div>
  );
}

/* ---- Modal crear / editar ---- */
function ModalUsuario({
  open, usuario, onClose, onSaved,
}: {
  open: boolean;
  usuario: UsuarioItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const esEdicion = !!usuario;

  useEffect(() => {
    if (open) {
      if (usuario) {
        form.setFieldsValue({ nombre: usuario.nombre, rol: usuario.rol, departamento: usuario.departamento });
      } else {
        form.resetFields();
      }
    }
  }, [open, usuario, form]);

  const guardar = async (vals: Record<string, string>) => {
    setLoading(true);
    try {
      if (esEdicion) {
        const payload: UpdateUsuarioPayload = { nombre: vals.nombre, rol: vals.rol as any, departamento: vals.departamento };
        await usuariosService.update(usuario!.id, payload);
        message.success('Usuario actualizado');
      } else {
        const payload: CreateUsuarioPayload = {
          nombre: vals.nombre, email: vals.email,
          password: vals.password, rol: vals.rol as any,
          departamento: vals.departamento,
        };
        await usuariosService.create(payload);
        message.success('Usuario creado');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={esEdicion ? `Editar: ${usuario!.nombre}` : 'Nuevo usuario'}
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
          <Input placeholder="Ej: Juan Pérez" />
        </Form.Item>
        {!esEdicion && (
          <>
            <Form.Item name="email" label="Correo electrónico" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="correo@empresa.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Contraseña inicial"
              rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
            >
              <Input.Password placeholder="Mínimo 6 caracteres" />
            </Form.Item>
          </>
        )}
        <Form.Item name="rol" label="Rol" rules={[{ required: true }]}>
          <Select placeholder="Selecciona un rol">
            {ROLES.map(r => (
              <Option key={r} value={r}>
                <Tag color={ROL_COLORS[r]} style={{ marginRight: 6 }} />
                {ROL_LABELS[r]}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="departamento" label="Departamento (opcional)">
          <Input placeholder="Ej: TI, Operaciones..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ---- Modal cambiar contraseña ---- */
function ModalPassword({ open, usuarioId, onClose }: { open: boolean; usuarioId: number; onClose: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const guardar = async (vals: { password: string }) => {
    setLoading(true);
    try {
      await usuariosService.cambiarPassword(usuarioId, vals.password);
      message.success('Contraseña actualizada');
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(e.message ?? 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Cambiar contraseña"
      open={open}
      onOk={() => form.submit()}
      onCancel={() => { form.resetFields(); onClose(); }}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={loading}
      width={380}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={guardar} style={{ paddingTop: 8 }}>
        <Form.Item
          name="password"
          label="Nueva contraseña"
          rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
        >
          <Input.Password placeholder="Mínimo 6 caracteres" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/* ============================================================
   USUARIOS PAGE
   ============================================================ */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUsuario, setEditUsuario] = useState<UsuarioItem | null>(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwUsuarioId, setPwUsuarioId] = useState<number>(0);
  const [busqueda, setBusqueda] = useState('');
  const rolActual = useAuthStore(s => s.usuario?.rol);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usuariosService.findAll();
      setUsuarios(data);
    } catch {
      message.error('No se pudo cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const desactivar = async (id: number) => {
    try {
      await usuariosService.deactivate(id);
      message.success('Usuario desactivado');
      await cargar();
    } catch (e: any) {
      message.error(e.message ?? 'Error');
    }
  };

  const filtrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.departamento ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  const isAdmin = rolActual === 'ADMIN';

  const columns: ColumnsType<UsuarioItem> = [
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_: unknown, u: UsuarioItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Initials nombre={u.nombre} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: u.activo ? '#0f172a' : '#94a3b8' }}>
              {u.nombre}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Rol',
      dataIndex: 'rol',
      render: (rol: keyof typeof ROL_LABELS) => (
        <span style={{
          background: ROL_COLORS[rol] + '18',
          color: ROL_COLORS[rol],
          border: `1px solid ${ROL_COLORS[rol]}33`,
          padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        }}>
          {ROL_LABELS[rol]}
        </span>
      ),
      filters: ROLES.map(r => ({ text: ROL_LABELS[r], value: r })),
      onFilter: (v, r) => r.rol === v,
    },
    {
      title: 'Departamento',
      dataIndex: 'departamento',
      render: (v?: string) => v || <span style={{ color: '#94a3b8' }}>—</span>,
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
      title: 'Último acceso',
      dataIndex: 'ultimoLogin',
      render: (v?: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{formatDate(v)}</span>,
    },
    {
      title: 'Creado',
      dataIndex: 'creadoEn',
      render: (v: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{formatDate(v)}</span>,
    },
    ...(isAdmin ? [{
      title: '',
      key: 'acciones',
      width: 110,
      render: (_: unknown, u: UsuarioItem) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Editar"><button className="it-btn" style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => { setEditUsuario(u); setModalOpen(true); }}><EditOutlined /></button></Tooltip>
          <Tooltip title="Cambiar contraseña"><button className="it-btn" style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => { setPwUsuarioId(u.id); setPwModalOpen(true); }}><LockOutlined /></button></Tooltip>
          {u.activo && (
            <Tooltip title="Desactivar">
              <Popconfirm title="¿Desactivar usuario?" onConfirm={() => desactivar(u.id)} okText="Sí" cancelText="No" okButtonProps={{ danger: true }}>
                <button className="it-btn" style={{ padding: '4px 8px', fontSize: 12, color: '#ef4444' }}>
                  <UserDeleteOutlined />
                </button>
              </Popconfirm>
            </Tooltip>
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #0891b2, #22d3ee)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            <TeamOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Usuarios
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13, marginTop: 2 }}>
              {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrado{usuarios.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Input.Search
              placeholder="Buscar usuario..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            {isAdmin && (
              <button className="it-btn it-btn-primary"
                onClick={() => { setEditUsuario(null); setModalOpen(true); }}>
                <PlusOutlined /> Nuevo usuario
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table
          dataSource={filtrados}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} usuarios` }}
          rowClassName={(r) => !r.activo ? 'row-inactive' : ''}
        />
      </div>

      <ModalUsuario
        open={modalOpen}
        usuario={editUsuario}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
      />
      <ModalPassword
        open={pwModalOpen}
        usuarioId={pwUsuarioId}
        onClose={() => setPwModalOpen(false)}
      />

      <style>{`.row-inactive td { opacity: 0.45; }`}</style>
    </div>
  );
}
