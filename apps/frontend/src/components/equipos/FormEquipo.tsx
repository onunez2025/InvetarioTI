import { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import type { Equipo, CreateEquipoPayload, UpdateEquipoPayload } from '../../types/equipo.types';
import { equiposService } from '../../services/equipos.service';

const { Option } = Select;

const TIPOS = ['SWITCH', 'SERVIDOR', 'PC', 'LAPTOP', 'ROUTER', 'ACCESS POINT',
  'FIREWALL', 'UPS', 'IMPRESORA', 'OTRO'];

interface Props {
  abierto: boolean;
  equipo: Equipo | null;   // null = crear nuevo
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function FormEquipo({ abierto, equipo, onCerrar, onGuardado }: Props) {
  const [form] = Form.useForm();
  const esEdicion = equipo !== null;

  useEffect(() => {
    if (abierto) {
      if (equipo) {
        form.setFieldsValue({
          ...equipo,
          endOfSale: equipo.endOfSale ? dayjs(equipo.endOfSale) : null,
          endOfSupport: equipo.endOfSupport ? dayjs(equipo.endOfSupport) : null,
        });
      } else {
        form.resetFields();
        form.setFieldValue('empresa', 'MT INDUSTRIAL');
        form.setFieldValue('estado', 'ACTIVO');
      }
    }
  }, [abierto, equipo, form]);

  const onFinish = async (valores: Record<string, unknown>) => {
    const payload = {
      ...valores,
      endOfSale: valores.endOfSale ? (valores.endOfSale as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
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

  return (
    <Modal
      title={esEdicion ? `Editar: ${equipo!.nombre}` : 'Nuevo equipo'}
      open={abierto}
      onCancel={onCerrar}
      onOk={() => form.submit()}
      okText="Guardar"
      cancelText="Cancelar"
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish} size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="empresa" label="Empresa" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nombre" label="Nombre dispositivo" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="tipo" label="Tipo">
              <Select allowClear>
                {TIPOS.map((t) => <Option key={t} value={t}>{t}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="estado" label="Estado">
              <Select>
                <Option value="ACTIVO">ACTIVO</Option>
                <Option value="MANTENIMIENTO">MANTENIMIENTO</Option>
                <Option value="BAJA">BAJA</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="marca" label="Marca">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="modelo" label="Modelo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="serie" label="Número de serie">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="version" label="Versión">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="departamento" label="Departamento">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ubicacion" label="Ubicación">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="gerencia" label="Gerencia">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ceco" label="Centro de costo">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endOfSale" label="End of Sale">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endOfSupport" label="End of Support">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
