# Sprint B — Reportes & Exportación: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón "Exportar Excel" en Equipos + módulo Reportes con 4 reportes descargables + errores de importación en Excel descargable.

**Architecture:** Módulo `ReportesModule` backend con `exceljs`. Frontend: `reportesService` + `ReportesPage`. La función helper `buildExcel` es reutilizable para todos los reportes.

**Tech Stack:** NestJS 11, `exceljs@^4.4.0`, React 18, Ant Design 5

**Spec:** `docs/superpowers/specs/2026-09-02-sprint-b-reportes-exportacion-design.md`

## Global Constraints

- `exceljs@^4.4.0` instalado en `apps/backend`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="reporte-<tipo>-<YYYY-MM-DD>.xlsx"`
- Endpoints bajo `/api/reportes` con `JwtAuthGuard` + roles `ADMIN`, `TI_ADMIN`
- Máximo 10,000 filas por reporte
- Schema `inventario_ti`

---

### Task 1: Instalar exceljs + helper `buildExcel`

**Files:**
- Create: `apps/backend/src/modules/reportes/excel.builder.ts`
- Modify: `apps/backend/package.json` (instalar exceljs)

**Interfaces:**
- Produces: `buildExcel(sheetName, columns, rows): Promise<Buffer>` — usado en Tasks 2 y 3

- [ ] **Step 1: Instalar exceljs**

```bash
cd apps/backend && npm install exceljs
```

- [ ] **Step 2: Crear `excel.builder.ts`**

```typescript
// apps/backend/src/modules/reportes/excel.builder.ts
import ExcelJS from 'exceljs';

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
  numFmt?: string;
}

export async function buildExcel(
  sheetName: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'InventarioTI — MT INDUSTRIAL';
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map(c => ({ key: c.key, header: c.header, width: c.width ?? 20 }));
  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.getRow(1).height = 20;
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
    columns.forEach((col, ci) => { if (col.numFmt) r.getCell(ci + 1).numFmt = col.numFmt; });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}
```

- [ ] **Step 3: Test de `buildExcel`**

```typescript
// apps/backend/src/modules/reportes/excel.builder.spec.ts
import { buildExcel } from './excel.builder';

it('buildExcel retorna Buffer con datos', async () => {
  const buf = await buildExcel('Test', [{ key:'nombre', header:'Nombre', width:20 }], [{ nombre:'Prueba' }]);
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(0);
});
```

```bash
cd apps/backend && npm test -- --testPathPattern=excel.builder
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/reportes/excel.builder.ts apps/backend/src/modules/reportes/excel.builder.spec.ts
git commit -m "feat(reportes): excel.builder helper con exceljs"
```

---

### Task 2: Módulo Reportes — Backend (4 endpoints)

**Files:**
- Create: `apps/backend/src/modules/reportes/reportes.module.ts`
- Create: `apps/backend/src/modules/reportes/reportes.service.ts`
- Create: `apps/backend/src/modules/reportes/reportes.controller.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `buildExcel` del Task 1
- Produces: `GET /api/reportes/{equipos,eos,por-gerencia,asignaciones-activas}`

- [ ] **Step 1: Crear `reportes.service.ts`**

```typescript
// apps/backend/src/modules/reportes/reportes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { buildExcel } from './excel.builder';

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async equipos(filtros: { estado?:string; gerencia?:string; modeloId?:string }) {
    let sql = `
      SELECT e.codigo, e.nombre, m.codigo AS modeloCodigo, m.tipo, m.marca,
             e.serie, e.estado, e.gerencia, e.departamento, e.ubicacion, e.ceco,
             CONCAT(c.nombre,' ',c.apellido) AS colaborador
      FROM inventario_ti.equipos e
      LEFT JOIN inventario_ti.modelos m ON m.id=e.modelo_id
      LEFT JOIN inventario_ti.asignaciones a ON a.equipo_id=e.id AND a.fecha_devolucion IS NULL
      LEFT JOIN inventario_ti.colaboradores c ON c.id=a.colaborador_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filtros.estado) { sql += ` AND e.estado=@${params.length}`; params.push(filtros.estado); }
    if (filtros.gerencia) { sql += ` AND e.gerencia=@${params.length}`; params.push(filtros.gerencia); }
    if (filtros.modeloId) { sql += ` AND e.modelo_id=@${params.length}`; params.push(parseInt(filtros.modeloId)); }
    sql += ` ORDER BY e.nombre`;
    const rows = await this.ds.query(sql, params);
    return buildExcel('Equipos', [
      { key:'codigo', header:'Código', width:14 },
      { key:'nombre', header:'Nombre dispositivo', width:28 },
      { key:'modeloCodigo', header:'Modelo', width:20 },
      { key:'tipo', header:'Tipo', width:14 },
      { key:'marca', header:'Marca', width:14 },
      { key:'serie', header:'Serie', width:20 },
      { key:'estado', header:'Estado', width:12 },
      { key:'colaborador', header:'Asignado a', width:28 },
      { key:'gerencia', header:'Gerencia', width:12 },
      { key:'departamento', header:'Departamento', width:28 },
      { key:'ubicacion', header:'Ubicación', width:20 },
      { key:'ceco', header:'CECO', width:12 },
    ], rows);
  }

  async eos() {
    const rows = await this.ds.query(`
      SELECT m.codigo, m.nombre, m.tipo, m.marca,
             m.end_of_sale AS endOfSale, m.end_of_support AS endOfSupport,
             DATEDIFF(DAY,GETUTCDATE(),m.end_of_support) AS diasRestantes,
             COUNT(e.id) AS totalUnidades,
             SUM(CASE WHEN e.estado='ACTIVO' THEN 1 ELSE 0 END) AS activos
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id=m.id
      WHERE m.end_of_support IS NOT NULL AND m.end_of_support <= DATEADD(DAY,365,GETUTCDATE()) AND m.activo=1
      GROUP BY m.codigo,m.nombre,m.tipo,m.marca,m.end_of_sale,m.end_of_support
      ORDER BY m.end_of_support ASC
    `);
    return buildExcel('EOS Próximos', [
      { key:'codigo', header:'Código', width:14 },
      { key:'nombre', header:'Nombre', width:28 },
      { key:'tipo', header:'Tipo', width:14 },
      { key:'marca', header:'Marca', width:14 },
      { key:'endOfSale', header:'End of Sale', width:14, numFmt:'DD/MM/YYYY' },
      { key:'endOfSupport', header:'End of Support', width:16, numFmt:'DD/MM/YYYY' },
      { key:'diasRestantes', header:'Días restantes', width:16 },
      { key:'totalUnidades', header:'Total unidades', width:14 },
      { key:'activos', header:'Activos', width:10 },
    ], rows);
  }

  async porGerencia() {
    const rows = await this.ds.query(`
      SELECT e.gerencia, e.departamento,
             COUNT(e.id) AS totalEquipos,
             SUM(CASE WHEN e.estado='ACTIVO' THEN 1 ELSE 0 END) AS activos,
             SUM(CASE WHEN e.estado='MANTENIMIENTO' THEN 1 ELSE 0 END) AS enMantenimiento,
             SUM(CASE WHEN e.estado='BAJA' THEN 1 ELSE 0 END) AS bajas,
             SUM(cd.precio_unitario) AS valorTotal
      FROM inventario_ti.equipos e
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.id=e.compra_detalle_id
      GROUP BY e.gerencia, e.departamento ORDER BY e.gerencia, e.departamento
    `);
    return buildExcel('Por Gerencia', [
      { key:'gerencia', header:'Gerencia', width:14 },
      { key:'departamento', header:'Departamento', width:32 },
      { key:'totalEquipos', header:'Total', width:10 },
      { key:'activos', header:'Activos', width:10 },
      { key:'enMantenimiento', header:'Mant.', width:10 },
      { key:'bajas', header:'Bajas', width:10 },
      { key:'valorTotal', header:'Valor total S/', width:16, numFmt:'#,##0.00' },
    ], rows);
  }

  async asignacionesActivas() {
    const rows = await this.ds.query(`
      SELECT CONCAT(c.nombre,' ',c.apellido) AS colaborador,
             c.gerencia, c.departamento,
             e.nombre AS equipo, m.nombre AS modelo, m.tipo,
             e.serie, e.codigo, a.fecha_asignacion AS fechaAsignacion,
             DATEDIFF(DAY,a.fecha_asignacion,GETUTCDATE()) AS diasAsignado
      FROM inventario_ti.asignaciones a
      JOIN inventario_ti.equipos e ON e.id=a.equipo_id
      JOIN inventario_ti.colaboradores c ON c.id=a.colaborador_id
      LEFT JOIN inventario_ti.modelos m ON m.id=e.modelo_id
      WHERE a.fecha_devolucion IS NULL ORDER BY c.apellido, c.nombre
    `);
    return buildExcel('Asignaciones Activas', [
      { key:'colaborador', header:'Colaborador', width:28 },
      { key:'gerencia', header:'Gerencia', width:12 },
      { key:'departamento', header:'Departamento', width:28 },
      { key:'equipo', header:'Dispositivo', width:24 },
      { key:'modelo', header:'Modelo', width:20 },
      { key:'tipo', header:'Tipo', width:14 },
      { key:'serie', header:'Serie', width:18 },
      { key:'codigo', header:'Código', width:14 },
      { key:'fechaAsignacion', header:'Fecha asignación', width:18, numFmt:'DD/MM/YYYY' },
      { key:'diasAsignado', header:'Días asignado', width:14 },
    ], rows);
  }
}
```

- [ ] **Step 2: Crear `reportes.controller.ts`**

```typescript
// apps/backend/src/modules/reportes/reportes.controller.ts
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportesService } from './reportes.service';

function sendExcel(res: Response, buffer: Buffer, name: string) {
  const fecha = new Date().toISOString().split('T')[0];
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${name}-${fecha}.xlsx"`,
  });
  res.end(buffer);
}

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TI_ADMIN')
export class ReportesController {
  constructor(private svc: ReportesService) {}

  @Get('equipos')
  async equipos(@Query() q: any, @Res() res: Response) {
    sendExcel(res, await this.svc.equipos(q), 'equipos');
  }

  @Get('eos')
  async eos(@Res() res: Response) {
    sendExcel(res, await this.svc.eos(), 'eos');
  }

  @Get('por-gerencia')
  async porGerencia(@Res() res: Response) {
    sendExcel(res, await this.svc.porGerencia(), 'por-gerencia');
  }

  @Get('asignaciones-activas')
  async asignaciones(@Res() res: Response) {
    sendExcel(res, await this.svc.asignacionesActivas(), 'asignaciones-activas');
  }
}
```

- [ ] **Step 3: Crear `reportes.module.ts` y registrar en AppModule**

```typescript
// apps/backend/src/modules/reportes/reportes.module.ts
import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({ controllers: [ReportesController], providers: [ReportesService] })
export class ReportesModule {}
```

En `app.module.ts` imports: agregar `ReportesModule`.

- [ ] **Step 4: Build para verificar errores TypeScript**

```bash
cd apps/backend && npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/reportes/ apps/backend/src/app.module.ts
git commit -m "feat(reportes): 4 endpoints Excel — equipos, EOS, por-gerencia, asignaciones"
```

---

### Task 3: Frontend — ReportesPage + botón Exportar en Equipos

**Files:**
- Create: `apps/frontend/src/services/reportes.service.ts`
- Create: `apps/frontend/src/pages/ReportesPage.tsx`
- Modify: `apps/frontend/src/pages/EquiposPage.tsx` (agregar botón Exportar)
- Modify: `apps/frontend/src/App.tsx` (agregar ruta + sidebar)

**Interfaces:**
- Consumes: endpoints `/api/reportes/*` del Task 2

- [ ] **Step 1: Crear `reportes.service.ts`**

```typescript
// apps/frontend/src/services/reportes.service.ts
import { useAuthStore } from '../store/authStore';

function hoy() { return new Date().toISOString().split('T')[0]; }

async function descargar(path: string, filename: string, params?: Record<string, string>) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  const token = useAuthStore.getState().token;
  const res = await fetch(`/api${path}${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al generar reporte');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reportesService = {
  equipos: (params?: Record<string, string>) =>
    descargar('/reportes/equipos', `equipos-${hoy()}.xlsx`, params),
  eos: () => descargar('/reportes/eos', `eos-${hoy()}.xlsx`),
  porGerencia: () => descargar('/reportes/por-gerencia', `por-gerencia-${hoy()}.xlsx`),
  asignacionesActivas: () => descargar('/reportes/asignaciones-activas', `asignaciones-${hoy()}.xlsx`),
};
```

- [ ] **Step 2: Crear `ReportesPage.tsx`**

```tsx
// apps/frontend/src/pages/ReportesPage.tsx
import React, { useState } from 'react';
import { Card, Row, Col, Button, Typography, message } from 'antd';
import { DownloadOutlined, LaptopOutlined, WarningOutlined, BankOutlined, TeamOutlined } from '@ant-design/icons';
import { reportesService } from '../services/reportes.service';

const REPORTES = [
  { key:'equipos', icon:<LaptopOutlined style={{fontSize:32,color:'#3b82f6'}}/>, title:'Inventario completo',
    desc:'Todos los equipos con modelo, serie, asignado y ubicación actual.',
    fn: () => reportesService.equipos() },
  { key:'eos', icon:<WarningOutlined style={{fontSize:32,color:'#f59e0b'}}/>, title:'Modelos próximos a EOS',
    desc:'Modelos con end_of_support en los próximos 365 días.',
    fn: () => reportesService.eos() },
  { key:'gerencia', icon:<BankOutlined style={{fontSize:32,color:'#10b981'}}/>, title:'Equipos por gerencia',
    desc:'Conteo y valor estimado de equipos por gerencia y departamento.',
    fn: () => reportesService.porGerencia() },
  { key:'asignaciones', icon:<TeamOutlined style={{fontSize:32,color:'#8b5cf6'}}/>, title:'Asignaciones vigentes',
    desc:'Todos los equipos actualmente asignados a colaboradores.',
    fn: () => reportesService.asignacionesActivas() },
];

export const ReportesPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const descargar = async (r: typeof REPORTES[0]) => {
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
      <Typography.Text type="secondary" style={{ display:'block', marginBottom:24 }}>
        Exporta reportes en formato Excel (.xlsx) con datos en tiempo real.
      </Typography.Text>
      <Row gutter={[16,16]}>
        {REPORTES.map(r => (
          <Col key={r.key} xs={24} sm={12} lg={6}>
            <Card style={{ height:'100%', textAlign:'center' }}>
              <div style={{ marginBottom:12 }}>{r.icon}</div>
              <Typography.Title level={5} style={{ marginTop:0 }}>{r.title}</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize:12, display:'block', marginBottom:16 }}>{r.desc}</Typography.Text>
              <Button
                type="primary" icon={<DownloadOutlined />}
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
```

- [ ] **Step 3: Agregar botón Exportar en `EquiposPage.tsx`**

Localizar en `EquiposPage.tsx` el botón "Nuevo equipo" y agregar antes de él:

```tsx
import { DownloadOutlined } from '@ant-design/icons';
import { reportesService } from '../services/reportes.service';

// En el JSX, junto al botón "Nuevo equipo":
<Button
  icon={<DownloadOutlined />}
  onClick={() => reportesService.equipos({
    ...(filtroEstado && { estado: filtroEstado }),
    ...(filtroGerencia && { gerencia: filtroGerencia }),
  })}
>
  Exportar
</Button>
```

Nota: los nombres exactos de las variables de filtro dependen de cómo estén definidas en `EquiposPage.tsx`. Leer el archivo antes de editar y adaptar.

- [ ] **Step 4: Agregar ruta en `App.tsx`**

```tsx
// En App.tsx — agregar import y ruta:
import { ReportesPage } from './pages/ReportesPage';
// En las rutas:
<Route path="/reportes" element={<ReportesPage />} />
```

En el sidebar (buscar donde están los items del menú — puede ser en un array o componente `Sider`):
```tsx
{ key: '/reportes', icon: <FileExcelOutlined />, label: 'Reportes' }
```

Import: `import { FileExcelOutlined } from '@ant-design/icons';`

- [ ] **Step 5: Build frontend**

```bash
cd apps/frontend && npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/services/reportes.service.ts apps/frontend/src/pages/ReportesPage.tsx apps/frontend/src/pages/EquiposPage.tsx apps/frontend/src/App.tsx
git commit -m "feat(reportes): ReportesPage con 4 reportes + botón Exportar en Equipos"
```

---

### Task 4: Mejora de importación — Excel de errores

**Files:**
- Modify: `apps/backend/src/modules/integraciones/integraciones.service.ts`
- Modify: `apps/backend/src/modules/integraciones/integraciones.controller.ts`

- [ ] **Step 1: Modificar `importarExcel` para generar archivo de errores**

En `integraciones.service.ts`, importar `buildExcel`, `fs`, `path`, `crypto`:

```typescript
import { buildExcel } from '../reportes/excel.builder';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
```

Al final de `importarExcel`, tras el loop, agregar:

```typescript
let archivoErrores: string | undefined;
if (errores > 0 && filasConError.length > 0) {
  const uuid = crypto.randomUUID();
  const dir = '/tmp/import-errors';
  fs.mkdirSync(dir, { recursive: true });
  const buf = await buildExcel('Errores de importación', [
    { key:'fila', header:'Fila', width:8 },
    { key:'empresa', header:'EMPRESA', width:20 },
    { key:'nombre', header:'NOMBRE DISPOSITIVO', width:28 },
    { key:'tipo', header:'TIPO', width:14 },
    { key:'marca', header:'MARCA', width:14 },
    { key:'modelo', header:'MODELO', width:20 },
    { key:'serie', header:'SERIE', width:18 },
    { key:'error', header:'Error', width:50 },
  ], filasConError);
  fs.writeFileSync(path.join(dir, `${uuid}.xlsx`), buf);
  archivoErrores = uuid;
}
return { importados, errores, detalles, archivoErrores };
```

Dentro del loop, cuando hay error, además de hacer `errores++`, agregar a `filasConError`:
```typescript
const filasConError: any[] = [];
// ... en el catch del loop:
filasConError.push({
  fila: filas.indexOf(fila) + 2, // +2 por header de Excel
  empresa: fila.EMPRESA ?? '',
  nombre: fila['NOMBRE DISPOSITIVO'] ?? '',
  tipo: fila.TIPO ?? '',
  marca: fila.MARCA ?? '',
  modelo: fila.MODELO ?? '',
  serie: fila.SERIE ?? '',
  error: (error as Error).message,
});
// ídem para filas con modelo no encontrado
```

- [ ] **Step 2: Agregar endpoint de descarga en `integraciones.controller.ts`**

```typescript
@Get('errores/:uuid')
@UseGuards(JwtAuthGuard)
async descargarErrores(@Param('uuid') uuid: string, @Res() res: Response) {
  // Validar que uuid solo tenga chars seguros
  if (!/^[0-9a-f-]{36}$/.test(uuid)) throw new BadRequestException('UUID inválido');
  const filePath = `/tmp/import-errors/${uuid}.xlsx`;
  if (!require('fs').existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="errores-importacion.xlsx"`,
  });
  const stream = require('fs').createReadStream(filePath);
  stream.on('end', () => require('fs').unlinkSync(filePath)); // eliminar tras servir
  stream.pipe(res);
}
```

- [ ] **Step 3: Actualizar frontend para mostrar link de descarga**

En el componente/página de importación Excel (buscar donde se muestra el resultado de importación), después de mostrar `resultado.importados` y `resultado.errores`, añadir:

```tsx
{resultado?.archivoErrores && (
  <Alert
    type="warning"
    message={`${resultado.errores} fila(s) con error`}
    description={
      <Button size="small" icon={<DownloadOutlined />}
        onClick={() => window.open(`/api/integraciones/errores/${resultado.archivoErrores}`)}>
        Descargar Excel con errores
      </Button>
    }
  />
)}
```

- [ ] **Step 4: Build + commit**

```bash
cd apps/backend && npm run build 2>&1 | grep error | head -10
git add apps/backend/src/modules/integraciones/ apps/frontend/src/
git commit -m "feat(importacion): Excel descargable con filas erróneas"
```

---

### Task 5: Push y verificación

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verificar en producción**

- Navegar a `/reportes` → 4 cards visibles
- Descargar cada reporte → Excel válido con header oscuro y datos
- En EquiposPage → botón Exportar descarga Excel
- Importar un Excel con errores → aparece botón de descarga de errores

- [ ] **Step 3: Tag**

```bash
git tag sprint-b-done
```
