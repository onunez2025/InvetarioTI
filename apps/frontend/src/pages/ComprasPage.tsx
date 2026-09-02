import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  DatePicker,
  message,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { comprasService } from '../services/compras.service';
import { proveedoresService } from '../services/proveedores.service';
import { modelosService } from '../services/modelos.service';
import { useAuthStore } from '../store/authStore';
import type { Compra, TipoDocumento, CreateCompraPayload } from '../types/compra.types';
import type { Proveedor } from '../types/proveedor.types';
import type { Modelo } from '../types/modelo.types';

const TIPO_DOC_COLORS: Record<TipoDocumento, string> = {
  FACTURA:      'blue',
  OC:           'purple',
  BOLETA:       'green',
  NOTA_INGRESO: 'orange',
};

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: 'default',
  APROBADO: 'blue',
  RECIBIDO: 'green',
};

interface CompraFormValues {
  proveedorId: number;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  fechaDocumento: dayjs.Dayjs;
  observaciones?: string;
}

interface LineaForm {
  modeloId?: number;
  cantidad: number;
  precioUnitario?: number;
}

export default function ComprasPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const rolUsuario = (() => {
    if (!token) return 'VISUALIZADOR';
    try {
      return JSON.parse(atob(token.split('.')[1])).rol as string;
    } catch {
      return 'VISUALIZADOR';
    }
  })();

  const [compras, setCompras]   = useState<Compra[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [cargando, setCargando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [form] = Form.useForm<CompraFormValues>();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [modelos, setModelos]         = useState<Modelo[]>([]);
  const [lineas, setLineas]           = useState<LineaForm[]>([{ cantidad: 1 }]);

  const puedeCrear = ['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario);

  const cargar = async (p = page) => {
    setCargando(true);
    try {
      const resultado = await comprasService.listar(p);
      setCompras(resultado.data);
      setTotal(resultado.total);
    } catch {
      message.error('Error al cargar compras');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = async () => {
    form.resetFields();
    setLineas([{ cantidad: 1 }]);
    setModalAbierto(true);
    try {
      const [provs, mods] = await Promise.all([
        proveedoresService.listar(),
        modelosService.listar(),
      ]);
      setProveedores(provs);
      setModelos(mods.data);
    } catch {
      message.error('Error al cargar datos del formulario');
    }
  };

  const agregarLinea = () => {
    setLineas((prev) => [...prev, { cantidad: 1 }]);
  };

  const quitarLinea = (idx: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  const actualizarLinea = (
    idx: number,
    campo: keyof LineaForm,
    valor: number | undefined,
  ) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)),
    );
  };

  const onFinish = async (values: CompraFormValues) => {
    if (lineas.length === 0) {
      message.error('Agregue al menos una línea de detalle');
      return;
    }
    for (const l of lineas) {
      if (!l.modeloId) {
        message.error('Seleccione el modelo en todas las líneas');
        return;
      }
      if (!l.cantidad || l.cantidad < 1) {
        message.error('La cantidad debe ser al menos 1 en todas las líneas');
        return;
      }
    }
    setGuardando(true);
    try {
      const payload: CreateCompraPayload = {
        proveedorId:     values.proveedorId,
        tipoDocumento:   values.tipoDocumento,
        numeroDocumento: values.numeroDocumento,
        fechaDocumento:  values.fechaDocumento.format('YYYY-MM-DD'),
        observaciones:   values.observaciones ?? undefined,
        detalles: lineas.map((l) => ({
          modeloId:      l.modeloId!,
          cantidad:      l.cantidad,
          precioUnitario: l.precioUnitario,
        })),
      };
      const nueva = await comprasService.crear(payload);
      message.success('Compra registrada correctamente');
      setModalAbierto(false);
      navigate(`/compras/${nueva.id}`);
    } catch {
      message.error('Error al registrar la compra');
      setGuardando(false);
    }
  };

  const columnas: ColumnsType<Compra> = [
    {
      title: 'Proveedor',
      key: 'proveedor',
      render: (_: unknown, r: Compra) => r.proveedor.nombre,
    },
    {
      title: 'N° Documento',
      dataIndex: 'numeroDocumento',
      key: 'numeroDocumento',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      render: (tipo: TipoDocumento) => (
        <Tag color={TIPO_DOC_COLORS[tipo]}>{tipo}</Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      render: (f: string) => dayjs(f).format('DD/MM/YYYY'),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => (
        <Tag color={ESTADO_COLORS[estado] ?? 'default'}>{estado ?? 'BORRADOR'}</Tag>
      ),
    },
    {
      title: 'N° líneas',
      key: 'lineas',
      render: (_: unknown, r: Compra) => r.detalles.length,
    },
  ];

  return (
    <div className="anim-fadeIn">
      {/* ---- Page header ---- */}
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
              <ShoppingCartOutlined aria-hidden="true" />
            </div>
            <div>
              <div className="page-title">Compras</div>
              <div className="page-subtitle">
                {cargando
                  ? 'Cargando...'
                  : `${total.toLocaleString('es-PE')} compra${total !== 1 ? 's' : ''} registrada${total !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        {puedeCrear && (
          <button className="it-btn it-btn-primary" onClick={abrirModal}>
            <PlusOutlined aria-hidden="true" />
            Nueva compra
          </button>
        )}
      </div>

      {/* ---- Table ---- */}
      <Table<Compra>
        rowKey="id"
        size="small"
        loading={cargando}
        columns={columnas}
        dataSource={compras}
        onRow={(record) => ({
          onClick: () => navigate('/compras/' + record.id),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current:    page,
          pageSize:   20,
          total,
          onChange:   (p) => { setPage(p); cargar(p); },
          showTotal:  (t) => `${t} registros`,
        }}
      />

      {/* ---- Modal nueva compra ---- */}
      <Modal
        title="Nueva compra"
        open={modalAbierto}
        onCancel={() => setModalAbierto(false)}
        onOk={() => form.submit()}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        width={700}
        destroyOnClose
      >
        <Form<CompraFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="proveedorId"
            label="Proveedor"
            rules={[{ required: true, message: 'Seleccione un proveedor' }]}
          >
            <Select placeholder="Seleccionar proveedor" showSearch optionFilterProp="children">
              {proveedores.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.nombre}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tipoDocumento"
            label="Tipo de documento"
            rules={[{ required: true, message: 'Seleccione el tipo de documento' }]}
          >
            <Select placeholder="Tipo">
              <Select.Option value="FACTURA">Factura</Select.Option>
              <Select.Option value="OC">Orden de Compra</Select.Option>
              <Select.Option value="BOLETA">Boleta</Select.Option>
              <Select.Option value="NOTA_INGRESO">Nota de ingreso</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="numeroDocumento"
            label="N° Documento"
            rules={[{ required: true, message: 'Ingrese el número de documento' }]}
          >
            <Input placeholder="Ej. F001-00123" />
          </Form.Item>

          <Form.Item
            name="fechaDocumento"
            label="Fecha del documento"
            rules={[{ required: true, message: 'Seleccione la fecha' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={2} placeholder="Opcional" />
          </Form.Item>

          {/* ---- Líneas de detalle ---- */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            marginTop: 4,
            paddingTop: 16,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <strong style={{ fontSize: 14 }}>Líneas de detalle</strong>
              <button className="it-btn" type="button" onClick={agregarLinea}>
                <PlusOutlined aria-hidden="true" />
                Agregar línea
              </button>
            </div>

            {lineas.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                Sin líneas. Agregue al menos una.
              </div>
            )}

            {lineas.map((linea, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}
              >
                <Select
                  style={{ flex: 2 }}
                  placeholder="Modelo"
                  showSearch
                  optionFilterProp="children"
                  value={linea.modeloId}
                  onChange={(v: number) => actualizarLinea(idx, 'modeloId', v)}
                >
                  {modelos.map((m) => (
                    <Select.Option key={m.id} value={m.id}>
                      {m.codigo} — {m.nombre}
                    </Select.Option>
                  ))}
                </Select>

                <InputNumber
                  style={{ flex: 1 }}
                  min={1}
                  placeholder="Cantidad"
                  value={linea.cantidad}
                  onChange={(v) => actualizarLinea(idx, 'cantidad', v ?? 1)}
                />

                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  placeholder="Precio unit."
                  value={linea.precioUnitario}
                  onChange={(v) => actualizarLinea(idx, 'precioUnitario', v ?? undefined)}
                />

                <button
                  className="it-btn"
                  type="button"
                  onClick={() => quitarLinea(idx)}
                  disabled={lineas.length === 1}
                  style={{
                    color: lineas.length === 1 ? undefined : '#ef4444',
                    borderColor: lineas.length === 1 ? undefined : '#fca5a5',
                  }}
                >
                  <DeleteOutlined aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </Form>
      </Modal>
    </div>
  );
}
