import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  StopOutlined,
  WarningOutlined,
  InboxOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '../services/dashboard.service';
import { KpiCard } from '../components/dashboard/KpiCard';
import { EosTable } from '../components/dashboard/EosTable';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const DashboardPage: React.FC = () => {
  const [resumen, setResumen] = useState<any>(null);
  const [graficos, setGraficos] = useState<any>(null);
  const [eos, setEos] = useState<any[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.resumen().then(setResumen),
      dashboardService.graficos().then(setGraficos),
      dashboardService.eosProximos().then((d) => setEos(d?.data ?? [])),
      dashboardService.actividadReciente().then((d) => setActividad(d?.data ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading || !resumen) return <Spin style={{ display: 'block', marginTop: 80 }} />;

  const kpis = [
    { icon: <LaptopOutlined />, label: 'Total equipos', value: resumen.totalEquipos ?? 0, color: 'blue' },
    { icon: <CheckCircleOutlined />, label: 'Activos', value: resumen.activos ?? 0, color: 'green' },
    { icon: <ToolOutlined />, label: 'En mantenimiento', value: resumen.enMantenimiento ?? 0, color: 'yellow' },
    { icon: <StopOutlined />, label: 'Bajas', value: resumen.bajas ?? 0, color: 'gray' },
    {
      icon: <WarningOutlined />,
      label: 'EOS < 90 días',
      value: resumen.eosProximos90 ?? 0,
      color: 'red',
      alert: (resumen.eosProximos90 ?? 0) > 0,
    },
    {
      icon: <InboxOutlined />,
      label: 'Stock bajo (≤3)',
      value: resumen.stockBajo ?? 0,
      color: 'yellow',
      alert: (resumen.stockBajo ?? 0) > 0,
    },
    { icon: <UserOutlined />, label: 'Sin asignar', value: resumen.equiposSinAsignar ?? 0, color: 'gray' },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Dashboard
      </Typography.Title>

      {/* KPIs */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <Col key={i} xs={12} sm={8} md={6} lg={4}>
            <KpiCard {...k} />
          </Col>
        ))}
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={8}>
          <Card title="Equipos por tipo" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={graficos?.porTipo ?? []}
                  dataKey="total"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(e: any) => e.tipo}
                >
                  {(graficos?.porTipo ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Equipos por gerencia (top 8)" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={graficos?.porGerencia ?? []}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gerencia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card title="Adquisiciones últimos 12 meses" size="small">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={graficos?.adquisicionesPorMes ?? []}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cantidad"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* EOS + Actividad */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <>
                <WarningOutlined style={{ color: '#f59e0b', marginRight: 6 }} />
                Modelos próximos a EOS (180 días)
              </>
            }
            size="small"
          >
            <EosTable data={eos} loading={false} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title="Actividad reciente"
            size="small"
            styles={{ body: { maxHeight: 280, overflowY: 'auto' } }}
          >
            <ActivityFeed data={actividad} loading={false} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
