import React, { useState } from 'react';
import { Card, Row, Col, Button, Typography, message } from 'antd';
import {
  DownloadOutlined,
  LaptopOutlined,
  WarningOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { reportesService } from '../services/reportes.service';

const REPORTES = [
  {
    key: 'equipos',
    icon: <LaptopOutlined style={{ fontSize: 32, color: '#3b82f6' }} />,
    title: 'Inventario completo',
    desc: 'Todos los equipos con modelo, serie, asignado y ubicación actual.',
    fn: () => reportesService.equipos(),
  },
  {
    key: 'eos',
    icon: <WarningOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
    title: 'Modelos próximos a EOS',
    desc: 'Modelos con end_of_support en los próximos 365 días.',
    fn: () => reportesService.eos(),
  },
  {
    key: 'gerencia',
    icon: <BankOutlined style={{ fontSize: 32, color: '#10b981' }} />,
    title: 'Equipos por gerencia',
    desc: 'Conteo y valor estimado de equipos por gerencia y departamento.',
    fn: () => reportesService.porGerencia(),
  },
  {
    key: 'asignaciones',
    icon: <TeamOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />,
    title: 'Asignaciones vigentes',
    desc: 'Todos los equipos actualmente asignados a colaboradores.',
    fn: () => reportesService.asignacionesActivas(),
  },
];

export const ReportesPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const descargar = async (r: (typeof REPORTES)[0]) => {
    setLoading(r.key);
    try {
      await r.fn();
      message.success(`Reporte "${r.title}" descargado`);
    } catch {
      message.error('Error al generar el reporte');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <Typography.Title level={4}>Reportes</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Exporta reportes en formato Excel (.xlsx) con datos en tiempo real.
      </Typography.Text>
      <Row gutter={[16, 16]}>
        {REPORTES.map((r) => (
          <Col key={r.key} xs={24} sm={12} lg={6}>
            <Card style={{ height: '100%', textAlign: 'center' }}>
              <div style={{ marginBottom: 12 }}>{r.icon}</div>
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {r.title}
              </Typography.Title>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, display: 'block', marginBottom: 16 }}
              >
                {r.desc}
              </Typography.Text>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={loading === r.key}
                onClick={() => descargar(r)}
                block
              >
                Descargar Excel
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ReportesPage;
