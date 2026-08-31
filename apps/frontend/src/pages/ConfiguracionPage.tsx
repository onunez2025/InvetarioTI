import { useState, useEffect, useCallback } from 'react';
import { Table, Tabs, Input, Switch, Modal, message, Popconfirm, Tag } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Catalogo } from '../types/catalogo.types';
import { CATALOG_LABELS, CATALOG_ORDER } from '../types/catalogo.types';
import { catalogosService } from '../services/catalogos.service';
import { useCatalogosStore } from '../store/catalogosStore';
import { useAuthStore } from '../store/authStore';

/* ---- Inline edit modal ---- */
function ModalEditar({
  open,
  item,
  tipo,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: Catalogo | null;
  tipo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(item?.nombre ?? '');
      setExtra(item?.extra ?? '');
    }
  }, [open, item]);

  const guardar = async () => {
    if (!nombre.trim()) { message.warning('El nombre es obligatorio'); return; }
    setLoading(true);
    try {
      if (item) {
        await catalogosService.update(item.id, { nombre: nombre.trim(), extra: extra.trim() || undefined });
        message.success('Actualizado');
      } else {
        await catalogosService.create(tipo, nombre.trim(), extra.trim() || undefined);
        message.success('Creado');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const tipoLabel = CATALOG_LABELS[tipo] ?? tipo;

  return (
    <Modal
      title={item ? `Editar ${tipoLabel.slice(0, -1)}` : `Nuevo en ${tipoLabel}`}
      open={open}
      onOk={guardar}
      onCancel={onClose}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={loading}
      width={420}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre *</label>
          <Input
            value={nombre}
            onChange={e => setNombre(e.target.value.toUpperCase())}
            placeholder="Nombre del ítem"
            autoFocus
            onPressEnter={guardar}
          />
        </div>
        {(tipo === 'ceco') && (
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
              Código CECO (opcional)
            </label>
            <Input
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="Ej: CC-001"
            />
          </div>
        )}
        {tipo === 'empresa' && (
          <div>
            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
              RUC (opcional)
            </label>
            <Input
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="Ej: 20512345678"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---- Catalog tab panel ---- */
function CatalogPanel({ tipo }: { tipo: string }) {
  const [items, setItems] = useState<Catalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Catalogo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const invalidar = useCatalogosStore(s => s.invalidar);
  const rol = useAuthStore(s => s.usuario?.rol);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await catalogosService.findAllByTipo(tipo);
      setItems(data);
    } catch {
      message.error('No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleActivo = async (item: Catalogo) => {
    try {
      await catalogosService.update(item.id, { activo: !item.activo });
      await cargar();
      invalidar();
      message.success(item.activo ? 'Desactivado' : 'Activado');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const eliminar = async (id: number) => {
    try {
      await catalogosService.remove(id);
      await cargar();
      invalidar();
      message.success('Eliminado');
    } catch (e: any) {
      message.error(e.message ?? 'No se pudo eliminar');
    }
  };

  const isAdmin = rol === 'ADMIN';

  const filtrados = items.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (i.extra ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  const columns: ColumnsType<Catalogo> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    ...(tipo === 'ceco' || tipo === 'empresa' ? [{
      title: tipo === 'ceco' ? 'Código' : 'RUC',
      dataIndex: 'extra',
      render: (v: string) => v ? <Tag>{v}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    }] : []),
    {
      title: 'Estado',
      dataIndex: 'activo',
      width: 100,
      render: (v: boolean, record: Catalogo) => (
        <Switch
          checked={v}
          size="small"
          disabled={!isAdmin}
          onChange={() => toggleActivo(record)}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
        />
      ),
    },
    ...(isAdmin ? [{
      title: '',
      key: 'acciones',
      width: 90,
      render: (_: unknown, record: Catalogo) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="it-btn"
            style={{ padding: '4px 8px', fontSize: 12 }}
            onClick={() => { setEditItem(record); setModalOpen(true); }}
          >
            <EditOutlined />
          </button>
          <Popconfirm
            title="¿Eliminar este ítem?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => eliminar(record.id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <button className="it-btn" style={{ padding: '4px 8px', fontSize: 12, color: '#ef4444' }}>
              <DeleteOutlined />
            </button>
          </Popconfirm>
        </div>
      ),
    }] : []),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Input
          placeholder="Buscar..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: 260 }}
          allowClear
        />
        <div style={{ flex: 1 }} />
        {isAdmin && (
          <button
            className="it-btn it-btn-primary"
            onClick={() => { setEditItem(null); setModalOpen(true); }}
          >
            <PlusOutlined /> Agregar
          </button>
        )}
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtrados.length} ítems</span>
      </div>

      <Table
        dataSource={filtrados}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        rowClassName={(r) => !r.activo ? 'row-inactive' : ''}
      />

      <ModalEditar
        open={modalOpen}
        item={editItem}
        tipo={tipo}
        onClose={() => setModalOpen(false)}
        onSaved={() => { cargar(); invalidar(); }}
      />
    </div>
  );
}

/* ============================================================
   CONFIGURACIÓN PAGE
   ============================================================ */
export default function ConfiguracionPage() {
  const tabs = CATALOG_ORDER.map(tipo => ({
    key: tipo,
    label: (
      <span style={{ fontSize: 13 }}>
        {CATALOG_LABELS[tipo]}
      </span>
    ),
    children: <CatalogPanel tipo={tipo} />,
  }));

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease both' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            <SettingOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Configuración
            </h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: 13, marginTop: 2 }}>
              Gestiona las listas desplegables de los formularios
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        border: '1px solid #bfdbfe',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 24,
        fontSize: 13,
        color: '#1d4ed8',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 16 }}>💡</span>
        <span>
          Los valores activos de cada catálogo aparecen como opciones desplegables en el formulario de equipos.
          Desactívalos para ocultarlos sin eliminarlos.
        </span>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        padding: '0 20px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <Tabs items={tabs} size="small" />
      </div>

      <style>{`
        .row-inactive td { opacity: 0.45; }
        .row-inactive td:first-child { text-decoration: line-through; }
      `}</style>
    </div>
  );
}
