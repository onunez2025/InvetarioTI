# Sprint A — Dashboard & Métricas: Design Spec

**Fecha:** 2026-09-02  
**Estado:** Aprobado para implementación

---

## Objetivo

Convertir el Dashboard actual (4 contadores en cero, sin gráficos) en un panel ejecutivo real con métricas visuales, alertas de EOS y feed de actividad. El resultado debe ser útil al primer vistazo, sin necesidad de navegar a otras páginas.

## Arquitectura

El backend expone 3 nuevos endpoints bajo `/api/dashboard`. El frontend reemplaza el contenido de `DashboardPage.tsx` usando **Recharts** para gráficos (no Chart.js — Recharts es más simple de integrar con Ant Design). Zustand no necesita store nuevo; los datos se cargan con `useEffect` + `useState` local.

## Tech Stack

- Backend: NestJS 11, TypeORM raw queries, Azure SQL `inventario_ti`
- Frontend: React 18, Ant Design 5, **Recharts 2.x** (nueva dependencia)
- No migraciones de BD requeridas (solo queries sobre tablas existentes)

---

## Global Constraints

- Schema Azure SQL: `inventario_ti` en todas las queries
- `synchronize: false` — cero cambios de entidad sin migración
- Recharts versión `^2.12.0` — instalar en `apps/frontend`
- Sin librerías de chart adicionales (solo Recharts)
- Todos los endpoints bajo `/api/dashboard` protegidos con `JwtAuthGuard`
- Colores de gráficos: `#3b82f6` (azul), `#10b981` (verde), `#f59e0b` (amarillo), `#ef4444` (rojo)

---

## Componentes de Backend

### Endpoint 1: `GET /api/dashboard/resumen`

Retorna los KPIs principales.

```typescript
// Response shape
{
  totalEquipos: number,
  activos: number,
  enMantenimiento: number,
  bajas: number,
  eosProximos90: number,      // modelos cuyo end_of_support <= hoy+90días
  stockBajo: number,           // modelos tieneSerie=false con disponible <= 3
  colaboradoresActivos: number,
  equiposSinAsignar: number,
}
```

SQL para `eosProximos90`:
```sql
SELECT COUNT(*) FROM inventario_ti.modelos
WHERE end_of_support IS NOT NULL
  AND end_of_support <= DATEADD(DAY, 90, GETUTCDATE())
  AND activo = 1
```

SQL para `equiposSinAsignar`:
```sql
SELECT COUNT(*) FROM inventario_ti.equipos e
WHERE e.estado = 'ACTIVO'
  AND NOT EXISTS (
    SELECT 1 FROM inventario_ti.asignaciones a
    WHERE a.equipo_id = e.id AND a.fecha_devolucion IS NULL
  )
```

### Endpoint 2: `GET /api/dashboard/graficos`

```typescript
// Response shape
{
  porTipo: { tipo: string, total: number }[],       // pie chart
  porGerencia: { gerencia: string, total: number }[], // bar chart (top 8)
  adquisicionesPorMes: { mes: string, cantidad: number }[], // line chart (12m)
}
```

SQL `adquisicionesPorMes`:
```sql
SELECT FORMAT(c.fecha_documento, 'yyyy-MM') AS mes, SUM(cd.cantidad) AS cantidad
FROM inventario_ti.compras c
JOIN inventario_ti.compras_detalle cd ON cd.compra_id = c.id
WHERE c.fecha_documento >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
GROUP BY FORMAT(c.fecha_documento, 'yyyy-MM')
ORDER BY mes
```

`porTipo`: query sobre `inventario_ti.modelos` JOIN `inventario_ti.equipos` agrupado por `m.tipo`.

`porGerencia`: query sobre `inventario_ti.equipos` agrupado por `gerencia`, ORDER BY total DESC, TOP 8.

### Endpoint 3: `GET /api/dashboard/eos-proximos`

```typescript
// Response shape — lista para tabla
{
  data: {
    modeloId: number,
    codigo: string,
    nombre: string,
    tipo: string,
    marca: string,
    endOfSupport: string,   // ISO date
    diasRestantes: number,
    totalUnidades: number,
  }[]
}
```

```sql
SELECT TOP 20
  m.id AS modeloId, m.codigo, m.nombre, m.tipo, m.marca,
  m.end_of_support AS endOfSupport,
  DATEDIFF(DAY, GETUTCDATE(), m.end_of_support) AS diasRestantes,
  COUNT(e.id) AS totalUnidades
FROM inventario_ti.modelos m
LEFT JOIN inventario_ti.equipos e ON e.modelo_id = m.id AND e.estado = 'ACTIVO'
WHERE m.end_of_support IS NOT NULL
  AND m.end_of_support <= DATEADD(DAY, 180, GETUTCDATE())
  AND m.activo = 1
GROUP BY m.id, m.codigo, m.nombre, m.tipo, m.marca, m.end_of_support
ORDER BY m.end_of_support ASC
```

### Endpoint 4: `GET /api/dashboard/actividad-reciente`

```typescript
// Response shape
{
  data: {
    id: number,
    tabla: string,
    accion: string,
    descripcion: string,
    usuario: string,
    fecha: string,
  }[]
}
```

Query sobre `inventario_ti.auditoria` (tabla existente) ORDER BY fecha DESC, TOP 15. Join con `usuarios` para nombre.

---

## Módulo Backend

Archivo: `apps/backend/src/modules/dashboard/dashboard.module.ts`  
Archivo: `apps/backend/src/modules/dashboard/dashboard.controller.ts`  
Archivo: `apps/backend/src/modules/dashboard/dashboard.service.ts`

El servicio inyecta `DataSource` (no repos de entidad) y ejecuta raw SQL con `queryRunner.query()`.

Registrar `DashboardModule` en `AppModule`.

---

## Frontend

### Nueva dependencia

```bash
npm install recharts @types/recharts  # en apps/frontend
```

### Estructura de archivos

```
apps/frontend/src/
  services/dashboard.service.ts     (nuevo — 4 fetch functions)
  pages/DashboardPage.tsx           (reemplazar completo)
  components/dashboard/
    KpiCard.tsx                      (nuevo — tarjeta con ícono + número + delta)
    EosTable.tsx                     (nuevo — tabla de modelos próximos a EOS)
    ActivityFeed.tsx                 (nuevo — lista de actividad reciente)
```

### Layout del Dashboard

```
┌─────────────────────────────────────────────────────┐
│ Saludo  · fecha                              [ADMIN] │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────┤
│Total │Activ.│Mant. │ Bajas│EOS<90│Stock │Sin asig. │  ← 7 KpiCards
│      │      │      │      │ bajo │      │          │
├──────┴──────┴──────┴──────┴──────┴──────┴──────────┤
│  Pie: por tipo  │  Bar: por gerencia (top 8)        │
├─────────────────┴───────────────────────────────────┤
│  Line: adquisiciones últimos 12 meses               │
├───────────────────────┬─────────────────────────────┤
│  Tabla: EOS próximos  │  Feed: actividad reciente   │
└───────────────────────┴─────────────────────────────┘
```

### `KpiCard` props
```typescript
interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  alert?: boolean; // borde rojo si true
  onClick?: () => void; // navega a la sección correspondiente
}
```

### `EosTable` columns
| Campo | Render |
|---|---|
| Código | texto |
| Nombre | texto |
| Tipo | Tag |
| End of Support | fecha + badge rojo si <30 días, naranja si <90 |
| Días restantes | número (rojo si <0 = vencido) |
| Unidades activas | número |

### Colores de gráficos
```typescript
const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];
```

### `dashboard.service.ts`
```typescript
export const dashboardService = {
  resumen: () => api.get('/dashboard/resumen').then(r => r.data),
  graficos: () => api.get('/dashboard/graficos').then(r => r.data),
  eosProximos: () => api.get('/dashboard/eos-proximos').then(r => r.data),
  actividadReciente: () => api.get('/dashboard/actividad-reciente').then(r => r.data),
};
```

---

## Testing

Backend: unit tests para `DashboardService` mockeando `DataSource.query()`.  
Frontend: visual — navegar al dashboard y verificar que los 4 bloques renderizan sin errores de consola.

---

## Definition of Done

- [ ] 7 KPI cards con valores reales (no hardcodeados a 0)
- [ ] Pie chart "por tipo" renderiza con Recharts
- [ ] Bar chart "por gerencia" renderiza top 8
- [ ] Line chart "adquisiciones 12 meses" renderiza
- [ ] Tabla EOS próximos 180 días con colores correctos
- [ ] Feed de actividad reciente con 15 últimas entradas
- [ ] 0 errores de consola en producción
- [ ] Tests unitarios backend pasan
