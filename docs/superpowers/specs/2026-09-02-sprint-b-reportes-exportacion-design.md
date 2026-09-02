# Sprint B — Reportes & Exportación: Design Spec

**Fecha:** 2026-09-02  
**Estado:** Aprobado para implementación

---

## Objetivo

1. Agregar botón "Exportar Excel" en la página de Equipos (descarga el listado filtrado actual).
2. Crear un módulo de Reportes con 4 reportes estándar descargables en Excel.
3. Mejorar la importación Excel mostrando errores en un archivo descargable.

## Tech Stack

- Backend: NestJS 11, TypeORM, `exceljs` (nueva dep backend) para generación de Excel
- Frontend: React 18, Ant Design 5 — descarga via `Blob` + `URL.createObjectURL`
- Sin nuevas tablas de BD

---

## Global Constraints

- Schema: `inventario_ti`
- Librería Excel backend: **`exceljs@^4.4.0`** — instalar en `apps/backend`
- Los archivos generados se envían como `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Header: `Content-Disposition: attachment; filename="reporte-<tipo>-<YYYY-MM-DD>.xlsx"`
- Todos los endpoints bajo `/api/reportes` — `JwtAuthGuard` + rol mínimo `TI_ADMIN`
- Máximo 10,000 filas por reporte (agregar LIMIT con mensaje de aviso si se supera)

---

## Backend: Módulo Reportes

### Archivos nuevos
```
apps/backend/src/modules/reportes/
  reportes.module.ts
  reportes.controller.ts
  reportes.service.ts
  excel.builder.ts        ← helper que envuelve exceljs con estilos corporativos
```

### `excel.builder.ts` — wrapper reutilizable

```typescript
import ExcelJS from 'exceljs';

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
  numFmt?: string;   // '#,##0.00' para moneda, 'DD/MM/YYYY' para fecha
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
  // Header style
  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.getRow(1).height = 20;
  // Data rows
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
    // Apply numFmt per column
    columns.forEach((col, ci) => {
      if (col.numFmt) r.getCell(ci + 1).numFmt = col.numFmt;
    });
  });
  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  // Auto-filter
  ws.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
}
```

### Endpoints

#### `GET /api/reportes/equipos` — Inventario completo de equipos

Query params: `estado?`, `gerencia?`, `modeloId?` (mismos filtros que EquiposPage)

Columnas Excel:
| Key | Header | Width |
|---|---|---|
| codigo | Código | 14 |
| nombre | Nombre dispositivo | 28 |
| modeloCodigo | Modelo | 20 |
| tipo | Tipo | 14 |
| marca | Marca | 14 |
| serie | Número de serie | 20 |
| estado | Estado | 12 |
| colaborador | Asignado a | 28 |
| gerencia | Gerencia | 12 |
| departamento | Departamento | 28 |
| ubicacion | Ubicación | 20 |
| ceco | CECO | 12 |

SQL base:
```sql
SELECT e.codigo, e.nombre, m.codigo AS modeloCodigo, m.tipo, m.marca,
       e.serie, e.estado, e.gerencia, e.departamento, e.ubicacion, e.ceco,
       CONCAT(c.nombre, ' ', c.apellido) AS colaborador
FROM inventario_ti.equipos e
LEFT JOIN inventario_ti.modelos m ON m.id = e.modelo_id
LEFT JOIN inventario_ti.asignaciones a ON a.equipo_id = e.id AND a.fecha_devolucion IS NULL
LEFT JOIN inventario_ti.colaboradores c ON c.id = a.colaborador_id
WHERE 1=1
  /* filtros dinámicos via parámetros */
ORDER BY e.nombre
```

#### `GET /api/reportes/eos` — Modelos próximos a EOS

Columnas: código, nombre, tipo, marca, endOfSale, endOfSupport, diasRestantes, totalUnidades, totalActivos

#### `GET /api/reportes/por-gerencia` — Equipos por gerencia

Columnas: gerencia, departamento, totalEquipos, activos, enMantenimiento, bajas, valorTotal (suma precio_unitario de compras_detalle)

SQL:
```sql
SELECT e.gerencia, e.departamento, COUNT(e.id) AS totalEquipos,
       SUM(CASE WHEN e.estado='ACTIVO' THEN 1 ELSE 0 END) AS activos,
       SUM(CASE WHEN e.estado='MANTENIMIENTO' THEN 1 ELSE 0 END) AS enMantenimiento,
       SUM(CASE WHEN e.estado='BAJA' THEN 1 ELSE 0 END) AS bajas,
       SUM(cd.precio_unitario) AS valorTotal
FROM inventario_ti.equipos e
LEFT JOIN inventario_ti.compras_detalle cd ON cd.id = e.compra_detalle_id
GROUP BY e.gerencia, e.departamento
ORDER BY e.gerencia, e.departamento
```

#### `GET /api/reportes/asignaciones-activas` — Asignaciones vigentes

Columnas: colaborador, gerencia, departamento, equipo, modelo, tipo, serie, codigo, fechaAsignacion, diasAsignado

SQL:
```sql
SELECT CONCAT(c.nombre,' ',c.apellido) AS colaborador,
       c.gerencia, c.departamento,
       e.nombre AS equipo, m.nombre AS modelo, m.tipo,
       e.serie, e.codigo, a.fecha_asignacion,
       DATEDIFF(DAY, a.fecha_asignacion, GETUTCDATE()) AS diasAsignado
FROM inventario_ti.asignaciones a
JOIN inventario_ti.equipos e ON e.id = a.equipo_id
JOIN inventario_ti.colaboradores c ON c.id = a.colaborador_id
LEFT JOIN inventario_ti.modelos m ON m.id = e.modelo_id
WHERE a.fecha_devolucion IS NULL
ORDER BY c.apellido, c.nombre
```

#### `GET /api/reportes/importacion-errores/:jobId` — (ver sección importación)

### Controller pattern

```typescript
@Get('equipos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TI_ADMIN')
async exportEquipos(@Query() q: ReporteEquiposQueryDto, @Res() res: Response) {
  const buffer = await this.reportesService.equipos(q);
  const fecha = new Date().toISOString().split('T')[0];
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="equipos-${fecha}.xlsx"`,
  });
  res.end(buffer);
}
```

---

## Backend: Mejora de Importación Excel

Modificar `IntegracionesService.importarExcel()` para:
1. Al final de la importación, si `errores > 0`, generar un Excel con las filas erróneas
2. Guardar ese Excel temporalmente en disco (`/tmp/import-errors-<uuid>.xlsx`)
3. Retornar `{ importados, errores, archivoErrores?: string }` donde `archivoErrores` es el UUID

Nuevo endpoint `GET /api/integraciones/errores/:uuid` — sirve el archivo y lo elimina tras servir.

Formato del Excel de errores:
| Fila original | EMPRESA | NOMBRE DISPOSITIVO | TIPO | MARCA | MODELO | SERIE | Error |
|---|---|---|---|---|---|---|---|

---

## Frontend

### `apps/frontend/src/services/reportes.service.ts` (nuevo)

```typescript
async function descargar(endpoint: string, filename: string, params?: Record<string, string>) {
  const q = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`/api${endpoint}${q}`, {
    headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
  });
  if (!res.ok) throw new Error('Error al generar reporte');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const reportesService = {
  equipos: (params?: ReporteEquiposParams) =>
    descargar('/reportes/equipos', `equipos-${hoy()}.xlsx`, params as any),
  eos: () => descargar('/reportes/eos', `eos-${hoy()}.xlsx`),
  porGerencia: () => descargar('/reportes/por-gerencia', `por-gerencia-${hoy()}.xlsx`),
  asignacionesActivas: () => descargar('/reportes/asignaciones-activas', `asignaciones-${hoy()}.xlsx`),
};
function hoy() { return new Date().toISOString().split('T')[0]; }
```

### Cambios en EquiposPage

Agregar botón `Exportar` junto a `Nuevo equipo`:

```tsx
<Button
  icon={<DownloadOutlined />}
  onClick={() => reportesService.equipos(filtrosActuales)}
>
  Exportar
</Button>
```

Los `filtrosActuales` son el estado actual de filtros (estado, gerencia, modeloId).

### Nueva página `ReportesPage.tsx`

Ruta: `/reportes` (añadir en `App.tsx` y en sidebar)

UI: 4 cards, una por reporte, con botón "Descargar Excel" en cada una. Mostrar fecha de generación (siempre "en tiempo real"). Sin preview de datos — solo descarga directa.

```tsx
const REPORTES = [
  { key: 'equipos', icon: <LaptopOutlined />, title: 'Inventario completo', desc: 'Todos los equipos con modelo, serie, asignado, ubicación.' },
  { key: 'eos', icon: <WarningOutlined />, title: 'Modelos próximos a EOS', desc: 'Modelos con end_of_support en los próximos 180 días.' },
  { key: 'por-gerencia', icon: <BankOutlined />, title: 'Equipos por gerencia', desc: 'Conteo y valor por gerencia y departamento.' },
  { key: 'asignaciones-activas', icon: <TeamOutlined />, title: 'Asignaciones vigentes', desc: 'Todos los equipos actualmente asignados a colaboradores.' },
];
```

### Sidebar

Añadir "Reportes" en el sidebar de `App.tsx` o en el layout, con `FileExcelOutlined` como ícono.

---

## Testing

- Backend: test que `buildExcel(...)` retorna un Buffer > 0 bytes con las columnas correctas
- Frontend: botón Exportar en EquiposPage hace un GET con los filtros correctos (mock fetch)
- E2E manual: descargar cada reporte y verificar que el Excel abre en Excel/LibreOffice

---

## Definition of Done

- [ ] `exceljs` instalado en `apps/backend`
- [ ] 4 endpoints `/api/reportes/*` generan Excel válido
- [ ] Botón "Exportar" en EquiposPage descarga con filtros activos
- [ ] ReportesPage accesible desde sidebar con 4 cards
- [ ] Importación muestra link de descarga de errores si `errores > 0`
- [ ] Tests unitarios backend pasan
