import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, ShopOutlined } from '@ant-design/icons';
import { proveedoresService } from '../services/proveedores.service';
import { useAuthStore } from '../store/authStore';
import type { Proveedor, CreateProveedorPayload } from '../types/proveedor.types';

interface FormValues {
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
}

export default function ProveedoresPage() {
  const token = useAuthStore((s) => s.token);

  const rolUsuario = (() => {
    if (!token) return 'VISUALIZADOR';
    try {
      return JSON.parse(atob(token.split('.')[1])).rol as string;
    } catch {
      return 'VISUALIZADOR';
    }
  })();

  const puedeEditar = ['ADMIN', 'TI_ADMIN', 'TECNICO'].includes(rolUsuario);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando]       = useState(false);

  const [modalAbierto, setModalAbierto]     = useState(false);
  const [proveedorEditar, setProveedorEditar] = useState<Proveedor | null>(null);
  const [guardando, setGuardando]           = useState(false);

  const [form] = Form.useForm<FormValues>();

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await proveedoresService.listar();
      setProveedores(data);
    } catch {
      message.error('Error al cargar proveedores');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCrear = () => {
    setProveedorEditar(null);
    form.resetFields();
    setModalAbierto(true);
  };

  const abrirEditar = (p: Proveedor) => {
    setProveedorEditar(p);
    form.setFieldsValue({
      nombre: p.nombre,
      ruc: p.ruc,
      telefono: p.telefono,
      email: p.email,
    });
    setModalAbierto(true);
  };

  const cerrar = () => {
    setModalAbierto(false);
    form.resetFields();
  };

  const onFinish = async (values: FormValues) => {
    setGuardando(true);
    try {
      const payload: CreateProveedorPayload = {
        nombre: values.nombre,
        ruc: values.ruc,
        telefono: values.telefono,
        email: values.email,
      };

      if (proveedorEditar) {
        await proveedoresService.actualizar(proveedorEditar.id, payload);
        message.success('Proveedor actualizado correctamente');
      } else {
        await proveedoresService.crear(payload);
        message.success('Proveedor creado correctamente');
      }

      cerrar();
      cargar();
    } catch {
      message.error('Error al guardar el proveedor');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<Proveedor> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'RUC',
      dataIndex: 'ruc',
      key: 'ruc',
      width: 130,
      render: (v?: string) =>
        v ? (
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>
        ) : (
          <span style={{ color: '#94a3b8' }}>—</span>
        ),
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 130,
      render: (v?: string) => v ?? <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v?: string) => v ?? <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 80,
      render: (_: unknown, record: Proveedor) =>
        puedeEditar ? (
          <button
            className="it-btn"
            style={{ padding: '2px 10px', fontSize: 12 }}
            onClick={() => abrirEditar(record)}
          >
            <EditOutlined aria-hidden="true" />
            Editar
          </button>
        ) : null,
    },
  ];

  return (
    <div className="anim-fadeIn">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{
              width: 36, height: 36,
              background: '#fef3c7',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#d97706',
              fontSize: 18,
            }}>
              <ShopOutlined aria-hidden="true" />
            </div>
            <div>
              <div className="page-title">Proveedores</div>
              <div className="page-subtitle">
                {cargando
                  ? 'Cargando...'
                  : `${proveedores.length.toLocaleString('es-PE')} proveedor${proveedores.length !== 1 ? 'es' : ''} registrado${proveedores.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {puedeEditar && (
            <button className="it-btn it-btn-primary" onClick={abrirCrear}>
              <PlusOutlined aria-hidden="true" />
              Nuevo proveedor
            </button>
          )}
        </div>
      </div>

      {/* Table — no pagination (proveedores are few) */}
      <Table<Proveedor>
        rowKey="id"
        size="small"
        loading={cargando}
        dataSource={proveedores}
        columns={columns}
        pagination={false}
      />

      {/* Modal form */}
      <Modal
        title={proveedorEditar ? 'Editar proveedor' : 'Nuevo proveedor'}
        open={modalAbierto}
        onOk={() => form.submit()}
        onCancel={cerrar}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        destroyOnClose
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="small"
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Ej: Computec Peru S.A.C." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="ruc" label="RUC">
              <Input placeholder="20XXXXXXXXX" maxLength={11} />
            </Form.Item>
            <Form.Item name="telefono" label="Teléfono">
              <Input placeholder="Ej: 01 234-5678" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Ingresa un email válido' }]}
          >
            <Input placeholder="contacto@proveedor.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
