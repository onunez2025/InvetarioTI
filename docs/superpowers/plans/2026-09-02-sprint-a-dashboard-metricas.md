# Sprint A — Dashboard & Métricas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el dashboard de contadores vacíos por un panel ejecutivo con 7 KPIs reales, 3 gráficos Recharts, tabla EOS y feed de actividad.

**Architecture:** Nuevo módulo `DashboardModule` en backend con 4 endpoints de raw SQL. Frontend usa Recharts para gráficos y reemplaza `DashboardPage.tsx` completamente.

**Tech Stack:** NestJS 11, TypeORM DataSource (raw SQL), React 18, Ant Design 5, Recharts 2.x

**Spec:** `docs/superpowers/specs/2026-09-02-sprint-a-dashboard-metricas-design.md`

## Global Constraints

- Schema `inventario_ti` en todas las queries SQL
- `synchronize: false` — sin cambios en entidades ni migraciones
- Recharts `^2.12.0` instalado en `apps/frontend`
- Endpoints bajo `/api/dashboard` con `JwtAuthGuard`
- Colores: `#3b82f6`, `#10b981`, `#f59e0b`, `#ef4444`, `#8b5cf6`, `#ec4899`, `#14b8a6`, `#f97316`
- Consultar spec completa antes de comenzar cada tarea

---

### Task 1: Módulo Dashboard — Backend

**Files:**
- Create: `apps/backend/src/modules/dashboard/dashboard.module.ts`
- Create: `apps/backend/src/modules/dashboard/dashboard.controller.ts`
- Create: `apps/backend/src/modules/dashboard/dashboard.service.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Produces: `GET /api/dashboard/resumen`, `GET /api/dashboard/graficos`, `GET /api/dashboard/eos-proximos`, `GET /api/dashboard/actividad-reciente`

- [ ] **Step 1: Crear `dashboard.service.ts`**

```typescript
// apps/backend/src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async resumen() {
    const [row] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM inventario_ti.equipos) AS totalEquipos,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'ACTIVO') AS activos,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'MANTENIMIENTO') AS enMantenimiento,
        (SELECT COUNT(*) FROM inventario_ti.equipos WHERE estado = 'BAJA') AS bajas,
        (SELECT COUNT(*) FROM inventario_ti.modelos
          WHERE end_of_support IS NOT NULL
            AND end_of_support <= DATEADD(DAY,90,GETUTCDATE())
            AND activo=1) AS eosProximos90,
        (SELECT COUNT(*) FROM inventario_ti.colaboradores WHERE activo=1) AS colaboradoresActivos,
        (SELECT COUNT(*) FROM inventario_ti.equipos e WHERE e.estado='ACTIVO'
          AND NOT EXISTS (SELECT 1 FROM inventario_ti.asignaciones a
            WHERE a.equipo_id=e.id AND a.fecha_devolucion IS NULL)) AS equiposSinAsignar
    `);
    // Stock bajo: modelos tieneSerie=false, disponible <= 3
    const stockRows = await this.dataSource.query(`
      SELECT COUNT(*) AS stockBajo FROM (
        SELECT m.id,
          ISNULL(SUM(cd.cantidad),0) -
          ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
            WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) AS disponible
        FROM inventario_ti.modelos m
        LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id=m.id
        WHERE m.tiene_serie=0 AND m.activo=1
        GROUP BY m.id
        HAVING ISNULL(SUM(cd.cantidad),0) -
          ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
            WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) <= 3
      ) sub
    `);
    return { ...row, stockBajo: stockRows[0].stockBajo };
  }

  async graficos() {
    const porTipo = await this.dataSource.query(`
      SELECT m.tipo, COUNT(e.id) AS total
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id=m.id AND e.estado='ACTIVO'
      WHERE m.tipo IS NOT NULL
      GROUP BY m.tipo ORDER BY total DESC
    `);
    const porGerencia = await this.dataSource.query(`
      SELECT TOP 8 e.gerencia, COUNT(e.id) AS total
      FROM inventario_ti.equipos e
      WHERE e.gerencia IS NOT NULL AND e.estado='ACTIVO'
      GROUP BY e.gerencia ORDER BY total DESC
    `);
    const adquisiciones = await this.dataSource.query(`
      SELECT FORMAT(c.fecha_documento,'yyyy-MM') AS mes, SUM(cd.cantidad) AS cantidad
      FROM inventario_ti.compras c
      JOIN inventario_ti.compras_detalle cd ON cd.compra_id=c.id
      WHERE c.fecha_documento >= DATEADD(MONTH,-11,DATEFROMPARTS(YEAR(GETUTCDATE()),MONTH(GETUTCDATE()),1))
      GROUP BY FORMAT(c.fecha_documento,'yyyy-MM')
      ORDER BY mes
    `);
    return { porTipo, porGerencia, adquisicionesPorMes: adquisiciones };
  }

  async eosProximos() {
    const data = await this.dataSource.query(`
      SELECT TOP 20
        m.id AS modeloId, m.codigo, m.nombre, m.tipo, m.marca,
        m.end_of_support AS endOfSupport,
        DATEDIFF(DAY,GETUTCDATE(),m.end_of_support) AS diasRestantes,
        COUNT(e.id) AS totalUnidades
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id=m.id AND e.estado='ACTIVO'
      WHERE m.end_of_support IS NOT NULL
        AND m.end_of_support <= DATEADD(DAY,180,GETUTCDATE())
        AND m.activo=1
      GROUP BY m.id,m.codigo,m.nombre,m.tipo,m.marca,m.end_of_support
      ORDER BY m.end_of_support ASC
    `);
    return { data };
  }

  async actividadReciente() {
    const data = await this.dataSource.query(`
      SELECT TOP 15
        a.id, a.tabla, a.accion,
        a.descripcion, u.nombre AS usuario, a.creado_en AS fecha
      FROM inventario_ti.auditoria a
      LEFT JOIN inventario_ti.usuarios u ON u.id=a.usuario_id
      ORDER BY a.creado_en DESC
    `);
    return { data };
  }
}
```

- [ ] **Step 2: Crear `dashboard.controller.ts`**

```typescript
// apps/backend/src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}
  @Get('resumen') resumen() { return this.svc.resumen(); }
  @Get('graficos') graficos() { return this.svc.graficos(); }
  @Get('eos-proximos') eos() { return this.svc.eosProximos(); }
  @Get('actividad-reciente') actividad() { return this.svc.actividadReciente(); }
}
```

- [ ] **Step 3: Crear `dashboard.module.ts` y registrar en AppModule**

```typescript
// apps/backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
```

En `app.module.ts` imports: agregar `DashboardModule`.

- [ ] **Step 4: Crear test unitario**

```typescript
// apps/backend/src/modules/dashboard/dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DataSource } from 'typeorm';

describe('DashboardService', () => {
  let svc: DashboardService;
  const mockDs = { query: jest.fn() };

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [DashboardService, { provide: DataSource, useValue: mockDs }],
    }).compile();
    svc = m.get(DashboardService);
  });

  it('resumen retorna KPIs', async () => {
    mockDs.query
      .mockResolvedValueOnce([{ totalEquipos:5, activos:4, enMantenimiento:1, bajas:0, eosProximos90:2, colaboradoresActivos:10, equiposSinAsignar:1 }])
      .mockResolvedValueOnce([{ stockBajo: 1 }]);
    const r = await svc.resumen();
    expect(r.totalEquipos).toBe(5);
    expect(r.stockBajo).toBe(1);
  });
});
```

- [ ] **Step 5: Correr tests y verificar que pasan**

```bash
cd apps/backend && npm test -- --testPathPattern=dashboard
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/dashboard/ apps/backend/src/app.module.ts
git commit -m "feat(dashboard): backend module — 4 endpoints KPIs, graficos, EOS, actividad"
```

---

### Task 2: Recharts + Servicio Frontend

**Files:**
- Create: `apps/frontend/src/services/dashboard.service.ts`
- Modify: `apps/frontend/package.json` (instalar recharts)

**Interfaces:**
- Produces: `dashboardService.{resumen, graficos, eosProximos, actividadReciente}` — usados en Task 3

- [ ] **Step 1: Instalar Recharts**

```bash
cd apps/frontend && npm install recharts
```

- [ ] **Step 2: Crear `dashboard.service.ts`**

```typescript
// apps/frontend/src/services/dashboard.service.ts
import api from './api';
export const dashboardService = {
  resumen: () => api.get('/dashboard/resumen').then(r => r.data),
  graficos: () => api.get('/dashboard/graficos').then(r => r.data),
  eosProximos: () => api.get('/dashboard/eos-proximos').then(r => r.data),
  actividadReciente: () => api.get('/dashboard/actividad-reciente').then(r => r.data),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/services/dashboard.service.ts apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat(dashboard): frontend service + recharts dependency"
```

---

### Task 3: Componentes Dashboard

**Files:**
- Create: `apps/frontend/src/components/dashboard/KpiCard.tsx`
- Create: `apps/frontend/src/components/dashboard/EosTable.tsx`
- Create: `apps/frontend/src/components/dashboard/ActivityFeed.tsx`
- Modify: `apps/frontend/src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `dashboardService.*` del Task 2
- Produces: DashboardPage funcional con todos los bloques

- [ ] **Step 1: Crear `KpiCard.tsx`**

```tsx
// apps/frontend/src/components/dashboard/KpiCard.tsx
import { Card } from 'antd';
import React from 'react';
interface Props { icon: React.ReactNode; label: string; value: number; color?: string; alert?: boolean; onClick?: () => void; }
const COLORS: Record<string, string> = { blue:'#3b82f6', green:'#10b981', yellow:'#f59e0b', red:'#ef4444', gray:'#94a3b8' };
export const KpiCard: React.FC<Props> = ({ icon, label, value, color='blue', alert, onClick }) => (
  <Card
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default', borderLeft: `4px solid ${alert ? '#ef4444' : COLORS[color]}`, borderRadius:8 }}
    styles={{ body: { padding:'16px 20px' } }}
  >
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ fontSize:28, color: alert ? '#ef4444' : COLORS[color] }}>{icon}</div>
      <div>
        <div style={{ fontSize:24, fontWeight:700, lineHeight:1.2 }}>{value.toLocaleString()}</div>
        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{label}</div>
      </div>
    </div>
  </Card>
);
```

- [ ] **Step 2: Crear `EosTable.tsx`**

```tsx
// apps/frontend/src/components/dashboard/EosTable.tsx
import { Table, Tag, Badge } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
interface EosRow { modeloId:number; codigo:string; nombre:string; tipo:string; marca:string; endOfSupport:string; diasRestantes:number; totalUnidades:number; }
export const EosTable: React.FC<{ data: EosRow[]; loading: boolean }> = ({ data, loading }) => (
  <Table dataSource={data} rowKey="modeloId" loading={loading} size="small" pagination={false}
    scroll={{ y: 220 }}
    columns={[
      { title:'Código', dataIndex:'codigo', width:100 },
      { title:'Nombre', dataIndex:'nombre', ellipsis:true },
      { title:'Tipo', dataIndex:'tipo', width:100, render: t => <Tag>{t}</Tag> },
      { title:'End of Support', dataIndex:'endOfSupport', width:130,
        render: (v, r) => {
          const color = r.diasRestantes < 0 ? 'red' : r.diasRestantes < 30 ? 'red' : r.diasRestantes < 90 ? 'orange' : 'default';
          return <Badge status={color === 'red' ? 'error' : color === 'orange' ? 'warning' : 'default'} text={v?.split('T')[0]} />;
        }
      },
      { title:'Días', dataIndex:'diasRestantes', width:70,
        render: d => <span style={{ color: d < 0 ? '#ef4444' : d < 90 ? '#f59e0b' : '#64748b', fontWeight:600 }}>{d < 0 ? 'VENCIDO' : d}</span>
      },
      { title:'Unidades', dataIndex:'totalUnidades', width:80, align:'right' },
    ]}
  />
);
```

- [ ] **Step 3: Crear `ActivityFeed.tsx`**

```tsx
// apps/frontend/src/components/dashboard/ActivityFeed.tsx
import { List, Tag } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime); dayjs.locale('es');

const ACCION_COLOR: Record<string, string> = { CREATE:'green', UPDATE:'blue', DELETE:'red' };
interface FeedItem { id:number; tabla:string; accion:string; descripcion:string; usuario:string; fecha:string; }
export const ActivityFeed: React.FC<{ data: FeedItem[]; loading: boolean }> = ({ data, loading }) => (
  <List loading={loading} dataSource={data} rowKey="id" size="small"
    renderItem={item => (
      <List.Item style={{ padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ width:'100%' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Tag color={ACCION_COLOR[item.accion] ?? 'default'} style={{ fontSize:10 }}>{item.accion}</Tag>
            <span style={{ fontSize:11, color:'#94a3b8' }}>{dayjs(item.fecha).fromNow()}</span>
          </div>
          <div style={{ fontSize:12, color:'#334155', marginTop:2 }}>{item.descripcion}</div>
          <div style={{ fontSize:11, color:'#94a3b8' }}>por {item.usuario} · {item.tabla}</div>
        </div>
      </List.Item>
    )}
  />
);
```

- [ ] **Step 4: Reemplazar `DashboardPage.tsx`**

```tsx
// apps/frontend/src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Spin } from 'antd';
import {
  LaptopOutlined, CheckCircleOutlined, ToolOutlined, StopOutlined,
  WarningOutlined, InboxOutlined, UserOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../services/dashboard.service';
import { KpiCard } from '../components/dashboard/KpiCard';
import { EosTable } from '../components/dashboard/EosTable';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

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
      dashboardService.eosProximos().then(d => setEos(d.data)),
      dashboardService.actividadReciente().then(d => setActividad(d.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading || !resumen) return <Spin style={{ display:'block', marginTop:80 }} />;

  const kpis = [
    { icon:<LaptopOutlined/>, label:'Total equipos', value:resumen.totalEquipos, color:'blue' },
    { icon:<CheckCircleOutlined/>, label:'Activos', value:resumen.activos, color:'green' },
    { icon:<ToolOutlined/>, label:'En mantenimiento', value:resumen.enMantenimiento, color:'yellow' },
    { icon:<StopOutlined/>, label:'Bajas', value:resumen.bajas, color:'gray' },
    { icon:<WarningOutlined/>, label:'EOS < 90 días', value:resumen.eosProximos90, color:'red', alert:resumen.eosProximos90>0 },
    { icon:<InboxOutlined/>, label:'Stock bajo (≤3)', value:resumen.stockBajo, color:'yellow', alert:resumen.stockBajo>0 },
    { icon:<UserOutlined/>, label:'Sin asignar', value:resumen.equiposSinAsignar, color:'gray' },
  ];

  return (
    <div style={{ padding:'0 4px' }}>
      <Typography.Title level={4} style={{ marginBottom:16 }}>Dashboard</Typography.Title>

      {/* KPIs */}
      <Row gutter={[12,12]} style={{ marginBottom:20 }}>
        {kpis.map((k,i) => <Col key={i} xs={12} sm={8} md={6} lg={4}><KpiCard {...k} /></Col>)}
      </Row>

      {/* Gráficos */}
      <Row gutter={[16,16]} style={{ marginBottom:20 }}>
        <Col xs={24} md={8}>
          <Card title="Equipos por tipo" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={graficos?.porTipo??[]} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={80} label={e=>e.tipo}>
                  {(graficos?.porTipo??[]).map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Equipos por gerencia (top 8)" size="small">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graficos?.porGerencia??[]} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="gerencia" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16,16]} style={{ marginBottom:20 }}>
        <Col xs={24}>
          <Card title="Adquisiciones últimos 12 meses" size="small">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={graficos?.adquisicionesPorMes??[]} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={2} dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* EOS + Actividad */}
      <Row gutter={[16,16]}>
        <Col xs={24} lg={14}>
          <Card title={<><WarningOutlined style={{color:'#f59e0b',marginRight:6}}/>Modelos próximos a EOS (180 días)</>} size="small">
            <EosTable data={eos} loading={false} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Actividad reciente" size="small" styles={{ body: { maxHeight:280, overflowY:'auto' } }}>
            <ActivityFeed data={actividad} loading={false} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
```

- [ ] **Step 5: Verificar que TypeScript compila sin errores**

```bash
cd apps/frontend && npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/dashboard/ apps/frontend/src/pages/DashboardPage.tsx apps/frontend/src/services/dashboard.service.ts
git commit -m "feat(dashboard): KpiCards, EosTable, ActivityFeed, gráficos Recharts"
```

---

### Task 4: Push y verificación en producción

- [ ] **Step 1: Push a main**

```bash
git push origin main
```

- [ ] **Step 2: Esperar deploy Easypanel (~2 min) y verificar**

Navegar a `https://gac-sole-inventario-ti.jppsfv.easypanel.host` → Dashboard → verificar que:
- 7 KPIs muestran valores (aunque sean 0 si la BD está vacía)
- 3 gráficos renderizan sin errores
- Tabla EOS muestra filas o "Sin datos"
- Feed de actividad muestra entradas o lista vacía
- 0 errores en consola del browser

- [ ] **Step 3: Commit final con resultado**

```bash
git tag sprint-a-done
```
