import { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import type { Equipo, CreateEquipoPayload, UpdateEquipoPayload } from '../../types/equipo.types';
import { equiposService } from '../../services/equipos.service';
import { useCatalogosStore } from '../../store/catalogosStore';

const { Option } = Select;

const ESTADOS = ['ACTIVO', 'MANTENIMIENTO', 'BAJA'] as const;
const ESTADO_COLOR: Record<string, string> = {
  ACTIVO: '#16a34a', MANTENIMIENTO: '#d97706', BAJA: '#dc2626',
};

interface Props {
  abierto: boolean;
  equipo: Equipo | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function FormEquipo({ abierto, equipo, onCerrar, onGuardado }: Props) {
  const [form] = Form.useForm();
  const esEdicion = equipo !== null;

  /* ---- catálogos ---- */
  const { cargar, getOptions, cargado } = useCatalogosStore();
  useEffect(() => { cargar(); }, [cargar]);

  const empresas     = getOptions('empresa');
  const tipos        = getOptions('tipo_equipo');
  const marcas       = getOptions('marca');
  const ubicaciones  = getOptions('ubicacion');
  const gerencias    = getOptions('gerencia');
  const departamentos = getOptions('departamento');
  const cecos        = getOptions('ceco');

  /* ---- poblar formulario ---- */
  useEffect(() => {
    if (abierto) {
      if (equipo) {
        form.setFieldsValue({
          ...equipo,
          endOfSale:    equipo.endOfSale    ? dayjs(equipo.endOfSale)    : null,
          endOfSupport: equipo.endOfSupport ? dayjs(equipo.endOfSupport) : null,
        });
      } else {
        form.resetFields();
        form.setFieldValue('empresa', empresas[0] ?? 'MT INDUSTRIAL');
        form.setFieldValue('estado', 'ACTIVO');
      }
    }
  }, [abierto, equipo, form, empresas]);

  const onFinish = async (valores: Record<string, unknown>) => {
    const payload = {
      ...valores,
      endOfSale:    valores.endOfSale    ? (valores.endOfSale    as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      endOfSupport: valores.endOfSupport ? (valores.endOfSupport as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    } as CreateEquipoPayload | UpdateEquipoPayload;

    try {
      if (esEdicion) {
        await equiposService.actualizar(equipo!.id, payload as UpdateEquipoPayload);
        message.success('Equipo actualizado');
      } else {
        await equiposService.crear(payload as CreateEquipoPayload);
        message.success('Equipo creado');
      }
      onGuardado();
      onCerrar();
    } catch {
      message.error('No se pudo guardar el equipo. Verifica los datos.');
    }
  };

  /** Helper: Select con opciones del catálogo + texto libre como fallback */
  function CatSelect({ tipo, options, placeholder }: { tipo: string; options: string[]; placeholder?: string }) {
    return (
      <Select
        showSearch
        allowClear
        placeholder={cargado ? (placeholder ?? `Seleccionar ${tipo}`) : 'Cargando...'}
        loading={!cargado}
        filterOption={(input, opt) =>
          String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
        }
        mode={undefined}
      >
        {options.map(o => <Option key={o} value={o}>{o}</Option>)}
      </Select>
    );
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: '#fff',
          }}>💻</div>
          <span>{esEdicion ? `Editar: ${equipo!.nombre}` : 'Nuevo equipo'}</span>
        </div>
      }
      open={abierto}
      onCancel={onCerrar}
      onOk={() => form.submit()}
      okText="Guardar"
      cancelText="Cancelar"
      width={740}
      destroyOnClose
      styles={{ body: { paddingTop: 8 } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} size="small">
        {/* ── Sección: Identificación ── */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Identificación
          </div>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="empresa" label="Empresa" rules={[{ required: true }]}>
                <CatSelect tipo="empresa" options={empresas} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre del dispositivo" rules={[{ required: true }]}>
                <Input placeholder="Ej: LAPTOP-DELL-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipo" label="Tipo">
                <CatSelect tipo="tipo" options={tipos} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="marca" label="Marca">
                <CatSelect tipo="marca" options={marcas} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="modelo" label="Modelo">
                <Input placeholder="Ej: Latitude 5520" />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ── Sección: Inventario ── */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Inventario
          </div>
          <Row gutter={14}>
            <Col span={8}>
              <Form.Item name="serie" label="Número de serie">
                <Input placeholder="S/N" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="codigo" label="Código activo">
                <Input placeholder="Ej: ACT-00123" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estado" label="Estado">
                <Select>
                  {ESTADOS.map(e => (
                    <Option key={e} value={e}>
                      <span style={{
                        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                        background: ESTADO_COLOR[e], marginRight: 8,
                      }} />
                      {e}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="firmware" label="Firmware">
                <Input placeholder="Versión firmware" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="version" label="Versión OS / SW">
                <Input placeholder="Ej: Windows 11" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ceco" label="Centro de costo">
                <CatSelect tipo="ceco" options={cecos} />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ── Sección: Ubicación ── */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Ubicación y Organización
          </div>
          <Row gutter={14}>
            <Col span={8}>
              <Form.Item name="gerencia" label="Gerencia">
                <CatSelect tipo="gerencia" options={gerencias} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="departamento" label="Departamento">
                <CatSelect tipo="departamento" options={departamentos} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ubicacion" label="Ubicación">
                <CatSelect tipo="ubicacion" options={ubicaciones} />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* ── Sección: Ciclo de vida ── */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Ciclo de vida
          </div>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="endOfSale" label="End of Sale">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Fecha fin de venta" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endOfSupport" label="End of Support">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Fecha fin de soporte" />
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  );
}
