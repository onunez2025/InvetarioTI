import { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, AppstoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { modelosService } from '../services/modelos.service';
import { useAuthStore } from '../store/authStore';
import type { Modelo, CreateModeloPayload } from '../types/modelo.types';

const TIPOS = [
  'LAPTOP', 'PC', 'SERVIDOR', 'SWITCH', 'ROUTER',
  'ACCESS POINT', 'FIREWALL', 'UPS', 'IMPRESORA',
  'MOUSE', 'TECLADO', 'CARGADOR', 'CELULAR', 'OTRO',
];

function eosColor(endOfSupport?: string): { color: string; label: string } | null {
  if (!endOfSupport) return null;
  const dias = dayjs(endOfSupport).diff(dayjs(), 'day');
  if (dias < 0) return { color: '#dc2626', label: 'Vencido' };
  if (dias < 180) return { color: '#d97706', label: `${dias}d` };
  return { color: '#16a34a', label: '' };
}

interface FormValues {
  codigo: string;
  nombre: string;
  marca?: string;
  tipo?: string;
  descripcion?: string;
  tieneSerie: boolean;
  endOfSale?: dayjs.Dayjs;
  endOfSupport?: dayjs.Dayjs;
  firmwareRef?: string;
}

export default function ModelosPage() {
  const token = useAuthStore((s) => s.token);

  const rolUsuario = (() => {
    if (!token) return 'VISUALIZADOR';
    try {
      return JSON.parse(atob(token.split('.')[1])).rol as string;
    } catch {
      return 'VISUALIZADOR';
    }
  })();

  const puedeEditar = ['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario);

  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [total, setTotal]     = useState(0);
  const [cargando, setCargando] = useState(false);

  // Filters
  const [busqueda, setBusqueda]   = useState('');
  const [filtroTipo, setFiltroTipo]         = useState<string | undefined>(undefined);
  const [filtroSerie, setFiltroSerie]       = useState<boolean | undefined>(undefined);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modeloEditar, setModeloEditar] = useState<Modelo | null>(null);
  const [guardando, setGuardando]       = useState(false);

  const [form] = Form.useForm<FormValues>();

  const cargar = async (tipo?: string, tieneSerie?: boolean) => {
    setCargando(true);
    try {
      const result = await modelosService.listar({
        tipo,
        tieneSerie,
        activo: undefined,
      });
      setModelos(result.data);
      setTotal(result.total);
    } catch {
      message.error('Error al cargar modelos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(filtroTipo, filtroSerie);
  }, []);

  const aplicarFiltros = (tipo: string | undefined, serie: boolean | undefined) => {
    setFiltroTipo(tipo);
    setFiltroSerie(serie);
    cargar(tipo, serie);
  };

  const abrirCrear = () => {
    setModeloEditar(null);
    form.resetFields();
    form.setFieldsValue({ tieneSerie: true });
    setModalAbierto(true);
  };

  const abrirEditar = (m: Modelo) => {
    setModeloEditar(m);
    form.setFieldsValue({
      codigo: m.codigo,
      nombre: m.nombre,
      marca: m.marca,
      tipo: m.tipo,
      descripcion: m.descripcion,
      tieneSerie: m.tieneSerie,
      endOfSale: m.endOfSale ? dayjs(m.endOfSale) : undefined,
      endOfSupport: m.endOfSupport ? dayjs(m.endOfSupport) : undefined,
      firmwareRef: m.firmwareRef,
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
      const payload: CreateModeloPayload = {
        codigo: values.codigo,
        nombre: values.nombre,
        marca: values.marca,
        tipo: values.tipo,
        descripcion: values.descripcion,
        tieneSerie: values.tieneSerie ?? true,
        endOfSale: values.endOfSale
          ? values.endOfSale.format('YYYY-MM-DD')
          : undefined,
        endOfSupport: values.endOfSupport
          ? values.endOfSupport.format('YYYY-MM-DD')
          : undefined,
        firmwareRef: values.firmwareRef,
      };

      if (modeloEditar) {
        await modelosService.actualizar(modeloEditar.id, payload);
        message.success('Modelo actualizado correctamente');
      } else {
        await modelosService.crear(payload);
        message.success('Modelo creado correctamente');
      }

      cerrar();
      cargar(filtroTipo, filtroSerie);
    } catch {
      message.error('Error al guardar el modelo');
    } finally {
      setGuardando(false);
    }
  };

  // Client-side text search
  const modelosFiltrados = busqueda.trim()
    ? modelos.filter((m) => {
        const q = busqueda.toLowerCase();
        return (
          m.codigo.toLowerCase().includes(q) ||
          m.nombre.toLowerCase().includes(q) ||
          (m.marca ?? '').toLowerCase().includes(q)
        );
      })
    : modelos;

  const columns: ColumnsType<Modelo> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Marca',
      dataIndex: 'marca',
      key: 'marca',
      render: (v?: string) => v ?? <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (v?: string) =>
        v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#94a3b8' }}>—</span>,
    },
    {
      title: 'Tiene serie',
      dataIndex: 'tieneSerie',
      key: 'tieneSerie',
      width: 100,
      render: (v: boolean) =>
        v ? <Tag color="blue">Sí</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: 'End of Support',
      dataIndex: 'endOfSupport',
      key: 'endOfSupport',
      width: 160,
      render: (v?: string) => {
        if (!v) return <span style={{ color: '#94a3b8' }}>—</span>;
        const info = eosColor(v);
        if (!info) return <span>{dayjs(v).format('DD/MM/YYYY')}</span>;
        return (
          <span style={{ color: info.color, fontWeight: 600 }}>
            {dayjs(v).format('DD/MM/YYYY')}
            {info.label ? ` · ${info.label}` : ''}
          </span>
        );
      },
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 80,
      render: (_: unknown, record: Modelo) =>
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
              background: '#ede9fe',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c3aed',
              fontSize: 18,
            }}>
              <AppstoreOutlined aria-hidden="true" />
            </div>
            <div>
              <div className="page-title">Modelos</div>
              <div className="page-subtitle">
                {cargando
                  ? 'Cargando...'
                  : `${total.toLocaleString('es-PE')} modelo${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {puedeEditar && (
            <button className="it-btn it-btn-primary" onClick={abrirCrear}>
              <PlusOutlined aria-hidden="true" />
              Nuevo modelo
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 14,
      }}>
        <Input.Search
          placeholder="Buscar por código, nombre o marca..."
          allowClear
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onSearch={(v) => setBusqueda(v)}
          style={{ width: 280 }}
          size="small"
        />
        <Select
          placeholder="Tipo"
          allowClear
          style={{ width: 160 }}
          size="small"
          value={filtroTipo}
          onChange={(v: string | undefined) => aplicarFiltros(v, filtroSerie)}
        >
          {TIPOS.map((t) => (
            <Select.Option key={t} value={t}>{t}</Select.Option>
          ))}
        </Select>
        <Select
          placeholder="Tiene serie"
          allowClear
          style={{ width: 130 }}
          size="small"
          value={filtroSerie}
          onChange={(v: boolean | undefined) => aplicarFiltros(filtroTipo, v)}
        >
          <Select.Option value={true}>Sí</Select.Option>
          <Select.Option value={false}>No</Select.Option>
        </Select>
      </div>

      {/* Table */}
      <Table<Modelo>
        rowKey="id"
        size="small"
        loading={cargando}
        dataSource={modelosFiltrados}
        columns={columns}
        pagination={{
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (t) => `${t} resultado${t !== 1 ? 's' : ''}`,
        }}
      />

      {/* Modal form */}
      <Modal
        title={modeloEditar ? 'Editar modelo' : 'Nuevo modelo'}
        open={modalAbierto}
        onOk={() => form.submit()}
        onCancel={cerrar}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        destroyOnClose
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="small"
          initialValues={{ tieneSerie: true }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="codigo"
              label="Código"
              rules={[{ required: true, message: 'El código es requerido' }]}
            >
              <Input placeholder="Ej: LAP-HP-ELB-840G9" />
            </Form.Item>
            <Form.Item
              name="nombre"
              label="Nombre"
              rules={[{ required: true, message: 'El nombre es requerido' }]}
            >
              <Input placeholder="Ej: HP EliteBook 840 G9" />
            </Form.Item>
            <Form.Item name="marca" label="Marca">
              <Input placeholder="Ej: HP" />
            </Form.Item>
            <Form.Item name="tipo" label="Tipo">
              <Select placeholder="Selecciona tipo" allowClear>
                {TIPOS.map((t) => (
                  <Select.Option key={t} value={t}>{t}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción del modelo..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="endOfSale" label="End of Sale">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endOfSupport" label="End of Support">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="firmwareRef" label="Firmware Ref">
              <Input placeholder="Ej: https://..." />
            </Form.Item>
            <Form.Item name="tieneSerie" label="Tiene número de serie" valuePropName="checked">
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
