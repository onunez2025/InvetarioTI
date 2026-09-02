import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message, Spin } from 'antd';
import type { Equipo, CreateEquipoPayload, UpdateEquipoPayload } from '../../types/equipo.types';
import { equiposService } from '../../services/equipos.service';
import { modelosService } from '../../services/modelos.service';
import { useCatalogosStore } from '../../store/catalogosStore';
import type { Modelo } from '../../types/modelo.types';

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
  const isInit = useRef(true);

  /* ---- modelos ---- */
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<Modelo | null>(null);

  useEffect(() => {
    if (abierto) {
      setCargandoModelos(true);
      modelosService.listar({ tieneSerie: true, activo: true })
        .then(r => setModelos(r.data))
        .catch(() => {})
        .finally(() => setCargandoModelos(false));
    }
  }, [abierto]);

  /* ---- catálogos ---- */
  const { cargar, getOptions, getItems, getChildren, cargado } = useCatalogosStore();
  useEffect(() => { cargar(); }, [cargar]);

  const empresas = getOptions('empresa');
  const cecos    = getOptions('ceco');

  /* Cascada: gerencia → departamento → ubicación */
  const gerenciaWatch     = Form.useWatch('gerencia', form);
  const departamentoWatch = Form.useWatch('departamento', form);

  const gerenciaId = useMemo(() => {
    if (!gerenciaWatch) return undefined;
    return getItems('gerencia').find((g: { id: number; nombre: string }) => g.nombre === gerenciaWatch)?.id;
  }, [gerenciaWatch, getItems]);

  const deptoId = useMemo(() => {
    if (!departamentoWatch) return undefined;
    return getItems('departamento').find((d: { id: number; nombre: string }) => d.nombre === departamentoWatch)?.id;
  }, [departamentoWatch, getItems]);

  const deptosFiltrados = useMemo(() => {
    if (!gerenciaId) return getItems('departamento');
    const hijos = getChildren('departamento', gerenciaId);
    return hijos.length > 0 ? hijos : getItems('departamento');
  }, [gerenciaId, getItems, getChildren]);

  const ubicsFiltradas = useMemo(() => {
    if (!deptoId) return getItems('ubicacion');
    const hijos = getChildren('ubicacion', deptoId);
    return hijos.length > 0 ? hijos : getItems('ubicacion');
  }, [deptoId, getItems, getChildren]);

  /* ---- poblar formulario ---- */
  useEffect(() => {
    if (abierto) {
      isInit.current = true;
      if (equipo) {
        form.setFieldsValue({
          modeloId: equipo.modeloId,
          nombre: equipo.nombre,
          empresa: equipo.empresa,
          serie: equipo.serie,
          codigo: equipo.codigo,
          estado: equipo.estado,
          gerencia: equipo.gerencia,
          departamento: equipo.departamento,
          ubicacion: equipo.ubicacion,
          ceco: equipo.ceco,
        });
        setModeloSeleccionado(equipo.modelo ?? null);
      } else {
        form.resetFields();
        setModeloSeleccionado(null);
        form.setFieldValue('empresa', empresas[0] ?? 'MT INDUSTRIAL');
        form.setFieldValue('estado', 'ACTIVO');
      }
      requestAnimationFrame(() => { isInit.current = false; });
    }
  }, [abierto, equipo, form, empresas]);

  const prevGerencia = useRef<string | undefined>();
  useEffect(() => {
    if (isInit.current) { prevGerencia.current = gerenciaWatch; return; }
    if (prevGerencia.current !== undefined && prevGerencia.current !== gerenciaWatch) {
      form.setFieldValue('departamento', undefined);
      form.setFieldValue('ubicacion', undefined);
    }
    prevGerencia.current = gerenciaWatch;
  }, [gerenciaWatch, form]);

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
      modeloId: valores.modeloId,
      nombre: valores.nombre,
      empresa: valores.empresa,
      serie: valores.serie,
      codigo: valores.codigo,
      estado: valores.estado,
      gerencia: valores.gerencia,
      departamento: valores.departamento,
      ubicacion: valores.ubicacion,
      ceco: valores.ceco,
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

  function CatSelect({
    options, placeholder, hint,
  }: {
    options: Array<{ id: number; nombre: string; extra?: string }> | string[];
    placeholder?: string;
    hint?: string;
  }) {
    const items: Array<{ id: number | string; nombre: string; extra?: string }> =
      Array.isArray(options) && typeof options[0] === 'string'
        ? (options as string[]).map(n => ({ id: n, nombre: n }))
        : options as Array<{ id: number; nombre: string; extra?: string }>;

    return (
      <Select
        showSearch allowClear
        placeholder={!cargado ? 'Cargando...' : (hint ?? placeholder ?? 'Seleccionar')}
        loading={!cargado}
        filterOption={(input, opt) => String(opt?.label ?? opt?.value ?? '').toLowerCase().includes(input.toLowerCase())}
        optionFilterProp="label"
      >
        {items.map(o => {
          const label = o.extra ? `${o.nombre} — ${o.extra}` : o.nombre;
          return (
            <Option key={o.nombre} value={o.nombre} label={label}>
              <span style={{ fontWeight: 600 }}>{o.nombre}</span>
              {o.extra && <span style={{ color: '#64748b', fontSize: 11, marginLeft: 6 }}>{o.extra}</span>}
            </Option>
          );
        })}
      </Select>
    );
  }

  const deptoHint = gerenciaWatch ? `Departamentos de ${gerenciaWatch} (${deptosFiltrados.length})` : 'Seleccionar departamento';
  const ubicHint  = departamentoWatch ? `Ubicaciones de ${departamentoWatch} (${ubicsFiltradas.length})` : 'Seleccionar ubicación';

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

        {/* ── Modelo ── */}
        <Section label="Selección de modelo">
          <Form.Item name="modeloId" label="Modelo" rules={[{ required: true, message: 'Selecciona un modelo' }]}>
            <Select
              showSearch
              loading={cargandoModelos}
              placeholder={cargandoModelos ? <span><Spin size="small" style={{ marginRight: 6 }} />Cargando modelos...</span> : 'Buscar modelo por código o nombre...'}
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              onChange={(val: number) => {
                const m = modelos.find(x => x.id === val) ?? null;
                setModeloSeleccionado(m);
              }}
            >
              {modelos.map(m => (
                <Option key={m.id} value={m.id} label={`${m.codigo} — ${m.nombre}${m.marca ? ` (${m.marca})` : ''}`}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{m.codigo}</span>
                    <span style={{ color: '#64748b', marginLeft: 6 }}>{m.nombre}</span>
                    {m.marca && <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 11 }}>({m.marca})</span>}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {modeloSeleccionado && (
            <div style={{
              background: '#eff6ff', borderRadius: 8, padding: '10px 14px',
              marginTop: -8, marginBottom: 8, fontSize: 12, color: '#1e40af',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px',
            }}>
              <div><span style={{ color: '#64748b' }}>Tipo: </span><b>{modeloSeleccionado.tipo ?? '—'}</b></div>
              <div><span style={{ color: '#64748b' }}>Marca: </span><b>{modeloSeleccionado.marca ?? '—'}</b></div>
              <div><span style={{ color: '#64748b' }}>End of Support: </span><b>{modeloSeleccionado.endOfSupport ?? '—'}</b></div>
            </div>
          )}
        </Section>

        {/* ── Datos físicos ── */}
        <Section label="Datos físicos de la unidad">
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item name="empresa" label="Empresa" rules={[{ required: true }]}>
                <CatSelect options={empresas} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre del dispositivo">
                <Input placeholder="Ej: LAPTOP-DELL-001 (opcional si viene de compra)" />
              </Form.Item>
            </Col>
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
                    <span style={{ color: '#2563eb', fontSize: 11, marginLeft: 6 }}>↳ {deptosFiltrados.length} opciones</span>
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
                    <span style={{ color: '#2563eb', fontSize: 11, marginLeft: 6 }}>↳ {ubicsFiltradas.length} opciones</span>
                  )}
                </span>
              }>
                <CatSelect options={ubicsFiltradas} hint={ubicHint} />
              </Form.Item>
            </Col>
          </Row>
        </Section>

      </Form>
    </Modal>
  );
}

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
