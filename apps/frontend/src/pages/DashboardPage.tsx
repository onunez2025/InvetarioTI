import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert } from 'antd';
import {
  LaptopOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { equiposService } from '../services/equipos.service';
import type { Equipo } from '../types/equipo.types';

const { Title } = Typography;

const COLORES_ESTADO: Record<string, string> = {
  ACTIVO: '#52c41a',
  BAJA: '#ff4d4f',
  MANTENIMIENTO: '#faad14',
};

const COLORES_TIPO = ['#1677ff', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a', '#faad14'];

function agrupar<T>(arr: T[], clave: keyof T): { name: string; value: number }[] {
  const mapa: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[clave] ?? 'Sin dato');
    mapa[k] = (mapa[k] ?? 0) + 1;
  }
  return Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function DashboardPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    equiposService.listar({ limit: 1000 })
      .then(({ data }) => setEquipos(data))
      .catch(() => setError('No se pudieron cargar los datos del dashboard.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />;
  if (error) return <Alert type="error" message={error} />;

  const activos = equipos.filter((e) => e.estado === 'ACTIVO').length;
  const mantenimiento = equipos.filter((e) => e.estado === 'MANTENIMIENTO').length;

  const hoy = new Date();
  const proximosFin = equipos.filter((e) => {
    if (!e.endOfSupport) return false;
    const diff = (new Date(e.endOfSupport).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 180;
  }).length;

  const porEstado = agrupar(equipos, 'estado');
  const porTipo = agrupar(equipos, 'tipo').slice(0, 7);

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total equipos"
              value={equipos.length}
              prefix={<LaptopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Activos"
              value={activos}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="En mantenimiento"
              value={mantenimiento}
              valueStyle={{ color: '#faad14' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fin soporte ≤ 180 días"
              value={proximosFin}
              valueStyle={{ color: proximosFin > 0 ? '#ff4d4f' : '#52c41a' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Distribución por estado">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porEstado} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {porEstado.map((entry) => (
                    <Cell key={entry.name} fill={COLORES_ESTADO[entry.name] ?? '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Top tipos de equipo">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porTipo} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Equipos" radius={[4, 4, 0, 0]}>
                  {porTipo.map((_, i) => (
                    <Cell key={i} fill={COLORES_TIPO[i % COLORES_TIPO.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
