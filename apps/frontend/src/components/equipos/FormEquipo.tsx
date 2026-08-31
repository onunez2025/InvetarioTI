import { useEffect, useMemo, useRef } from 'react';
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
  const isInit = useRef(true); // evita resets durante carga inicial del form

  /* ---- catálogos ---- */
  const { cargar, getOptions, getItems, getChildren, cargado } = useCatalogosStore();
  useEffect(() => { cargar(); }, [cargar]);

  const empresas = getOptions('empresa');
  const tipos    = getOptions('tipo_equipo');
  const marcas   = getOptions('marca');
  const cecos    = getOptions('ceco');

  /* Cascada: gerencia → departamento → ubicación */
  const gerenciaWatch    = Form.useWatch('gerencia', form);
  const departamentoWatch = Form.useWatch('departamento', form);

  // ID del catálogo gerencia seleccionado
  const gerenciaId = useMemo(() => {
    if (!gerenciaWatch) return undefined;
    return getItems('gerencia').find(g => g.nombre === gerenciaWatch)?.id;
  }, [gerenciaWatch, getItems]);

  // ID del catálogo departamento seleccionado
  const deptoId = useMemo(() => {
    if (!departamentoWatch) return undefined;
    return getItems('departamento').find(d => d.nombre === departamentoWatch)?.id;
  }, [departamentoWatch, getItems]);

  // Opciones filtradas
  const deptosFiltrados = useMemo(() => {
    if (!gerenciaId) return getItems('departamento');
    const hijos = getChildren('departamento', gerenciaId);
    return hijos.length > 0 ? hijos : getItems('departamento'); // fallback si sin asignar
  }, [gerenciaId, getItems, getChildren]);

  const ubicsFiltradas = useMemo(() => {
    if (!deptoId) return getItems('ubicacion');
    const hijos = getChildren('ubicacion', deptoId);
    return hijos.length > 0 ? hijos : getItems('ubicacion'); // fallback
  }, [deptoId, getItems, getChildren]);

  /* ---- poblar formulario ---- */
  useEffect(() => {
    if (abierto) {
      isInit.current = true;
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
      // permitir cascada después de que Form.useWatch se establezca
      requestAnimationFrame(() => { isInit.current = false; });
    }
  }, [abierto, equipo, form, empresas]);

  // Cuando cambia gerencia → reset departamento y ubicación (solo en interacción del usuario)
  const prevGerencia = useRef<string | undefined>();
  useEffect(() => {
    if (isInit.current) { prevGerencia.current = gerenciaWatch; return; }
    if (prevGerencia.current !== undefined && prevGerencia.current !== gerenciaWatch) {
      form.setFieldValue('departamento', undefined);
      form.setFieldValue('ubicacion', undefined);
    }
    prevGerencia.current = gerenciaWatch;
  }, [gerenciaWatch, form]);

  // Cuando cambia departamento → reset ubicación
  const prevDepto = useRef<string | undefined>();
  useEffect(() => {
    if (isInit.current) { prevDepto.current = departamentoWatch; return; }
    if (prevDepto.current !== undefined && prevDepto.current !== departamentoWatch) {
      form.setFieldValue('ubicacion', undefined);
    }
    prevDepto.current = departamentoWatch;
  }, [departamentoWatch, form]);

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

  /** Select con búsqueda y opciones de catálogo */
  function CatSelect({
    options,
    placeholder,
    hint,
  }: {
    options: Array<{ id: number; nombre: string }> | string[];
    placeholder?: string;
    hint?: string;      // texto de ayuda en el placeholder cuando hay filtro activo
  }) {
    const items = Array.isArray(options) && typeof options[0] === 'string'
      ? (options as string[]).map(n => ({ id: n, nombre: n }))
      : options as Array<{ id: number; nombre: string }>;

    return (
      <Select
        showSearch
        allowClear
        placeholder={!cargado ? 'Cargando...' : (hint ?? placeholder ?? 'Seleccionar')}
        loading={!cargado}
        filterOption={(input, opt) =>
          String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
        }
      >
        {items.map(o => <Option key={o.nombre} value={o.nombre}>{o.nombre}</Option>)}
      </Select>
    );
  }

  const deptoHint = gerenciaWatch
    ? `Departamentos de ${gerenciaWatch} (${deptosFiltrados.length})`
    : 'Seleccionar departamento';
  const ubicHint = departamentoWatch
    ? `Ubicaciones de ${departamentoWatch} (${ubicsFiltradas.length})`
    : 'Seleccionar ubicación';

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

        {/* ── Identificación ── */}
        <Section label="Identificación">
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="empresa" label="Empresa" rules={[{ required: true }]}>
                <CatSelect options={empresas} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre del dispositivo" rules={[{ required: true }]}>
                <Input placeholder="Ej: LAPTOP-DELL-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipo" label="Tipo">
                <CatSelect options={tipos} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="marca" label="Marca">
                <CatSelect options={marcas} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="modelo" label="Modelo">
                <Input placeholder="Ej: Latitude 5520" />
              </Form.Item>
            </Col>
          </Row>
        </Section>

        {/* ── Inventario ── */}
        <Section label="Inventario">
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
                <CatSelect options={cecos} />
              </Form.Item>
            </Col>
          </Row>
        </Section>

        {/* ── Ubicación y Organización (cascada) ── */}
        <Section label="Ubicación y Organización">
          {gerenciaWatch && (
            <div style={{
              marginBottom: 10, padding: '6px 10px',
              background: '#eff6ff', borderRadius: 6, fontSize: 12, color: '#1d4ed8',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <span>🏢</span>
              <span>
                Los departamentos y ubicaciones se filtran según la gerencia seleccionada.
                {!gerenciaId && ' (Sin jerarquía asignada — mostrando todos)'}
              </span>
            </div>
          )}
          <Row gutter={14}>
            <Col span={8}>
              <Form.Item name="gerencia" label="Gerencia">
                <CatSelect options={getItems('gerencia')} placeholder="Seleccionar gerencia" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="departamento" label={
                <span>
                  Departamento
                  {gerenciaWatch && gerenciaId && (
                    <span style={{ color: '#2563eb', fontSize: 11, marginLeft: 6 }}>
                      ↳ {deptosFiltrados.length} opciones
                    </span>
                  )}
                </span>
              }>
                <CatSelect options={deptosFiltrados} hint={deptoHint} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ubicacion" label={
                <span>
                  Ubicación
                  {departamentoWatch && deptoId && (
                    <span style={{ color: '#2563eb', fontSize: 11, marginLeft: 6 }}>
                      ↳ {ubicsFiltradas.length} opciones
                    </span>
                  )}
                </span>
              }>
                <CatSelect options={ubicsFiltradas} hint={ubicHint} />
              </Form.Item>
            </Col>
          </Row>
        </Section>

        {/* ── Ciclo de vida ── */}
        <Section label="Ciclo de vida">
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
        </Section>

      </Form>
    </Modal>
  );
}

/** Contenedor de sección con etiqueta */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
