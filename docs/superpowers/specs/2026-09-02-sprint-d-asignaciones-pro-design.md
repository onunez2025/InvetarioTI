# Sprint D — Asignaciones Pro: Design Spec

**Fecha:** 2026-09-02  
**Estado:** Aprobado para implementación

---

## Objetivo

1. **Acta de entrega PDF**: Generar documento firmable con los equipos asignados a un colaborador.
2. **Flujo onboarding/offboarding**: Al desactivar colaborador → alerta de equipos pendientes de devolución.
3. **Asignación masiva de periféricos**: Asignar un modelo a múltiples colaboradores de una vez.
4. **Vista por departamento**: Filtro en AsignacionesPage que agrupa por departamento.

## Tech Stack

- Backend: NestJS 11, TypeORM, `pdfkit` (ya instalado en Sprint C), Azure SQL
- Frontend: React 18, Ant Design 5
- Sin nuevas migraciones de BD (usa tablas existentes)

---

## Global Constraints

- Schema: `inventario_ti`
- `pdfkit` ya disponible desde Sprint C
- El acta PDF se genera en tiempo real (sin guardar en disco) — stream directo al cliente
- El offboarding es una ALERTA (modal de confirmación), no bloquea la operación
- Asignación masiva: máximo 50 colaboradores por llamada

---

## Backend: Acta de Entrega PDF

### Endpoint `GET /api/asignaciones/acta/:colaboradorId`

Genera un PDF con:

**Estructura del documento:**
```
┌─────────────────────────────────────────────────────┐
│           MT INDUSTRIAL S.A.C                       │
│         ACTA DE ENTREGA DE EQUIPOS TI               │
│           Fecha: DD/MM/YYYY                         │
├─────────────────────────────────────────────────────┤
│ COLABORADOR                                         │
│ Nombre: [nombre completo]                           │
│ Cargo: [cargo] | Gerencia: [gerencia]               │
│ Departamento: [departamento]                        │
├─────────────────────────────────────────────────────┤
│ EQUIPOS ASIGNADOS                                   │
│ ┌──────────────┬────────────┬──────────┬──────────┐ │
│ │ Dispositivo  │ Modelo     │ Serie    │ Fecha    │ │
│ ├──────────────┼────────────┼──────────┼──────────┤ │
│ │ ...          │ ...        │ ...      │ ...      │ │
│ └──────────────┴────────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────────┤
│ PERIFÉRICOS ASIGNADOS                               │
│ ┌──────────────────────────┬────────┬────────────┐  │
│ │ Modelo                   │ Cant.  │ Fecha      │  │
│ ├──────────────────────────┼────────┼────────────┤  │
│ │ ...                      │ ...    │ ...        │  │
│ └──────────────────────────┴────────┴────────────┘  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ El colaborador declara recibir los equipos          │
│ listados en buen estado y se compromete a           │
│ devolverlos al finalizar su vínculo laboral.        │
│                                                     │
│ ____________________    ____________________        │
│ Firma colaborador        Firma responsable TI       │
│ [nombre]                 [nombre TI]                │
└─────────────────────────────────────────────────────┘
```

```typescript
// apps/backend/src/modules/asignaciones/asignaciones.service.ts — nuevo método
async generarActa(colaboradorId: number, usuarioTi: { nombre: string }): Promise<Buffer> {
  // 1. Query colaborador + equipos activos + periféricos activos
  // 2. Construir PDF con pdfkit (A4, márgenes 50px)
  // 3. Retornar Buffer
}
```

SQL equipos activos del colaborador:
```sql
SELECT e.nombre AS dispositivo, m.nombre AS modelo, m.tipo,
       e.serie, e.codigo, a.fecha_asignacion
FROM inventario_ti.asignaciones a
JOIN inventario_ti.equipos e ON e.id = a.equipo_id
LEFT JOIN inventario_ti.modelos m ON m.id = e.modelo_id
WHERE a.colaborador_id = @id AND a.fecha_devolucion IS NULL
ORDER BY a.fecha_asignacion
```

SQL periféricos activos:
```sql
SELECT m.nombre AS modelo, m.tipo, sa.cantidad, sa.fecha_inicio
FROM inventario_ti.stock_asignaciones sa
JOIN inventario_ti.modelos m ON m.id = sa.modelo_id
WHERE sa.colaborador_id = @id AND sa.fecha_fin IS NULL
ORDER BY sa.fecha_inicio
```

Response headers:
```
Content-Type: application/pdf
Content-Disposition: inline; filename="acta-entrega-{apellido}-{YYYY-MM-DD}.pdf"
```

**Controller:**
```typescript
@Get('acta/:colaboradorId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TI_ADMIN', 'TI_USER')
async actaEntrega(@Param('colaboradorId') id: number, @Req() req, @Res() res: Response) {
  const buffer = await this.asignacionesService.generarActa(id, req.user);
  const fecha = new Date().toISOString().split('T')[0];
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="acta-${id}-${fecha}.pdf"` });
  res.end(buffer);
}
```

---

## Backend: Offboarding — Alerta de Equipos Pendientes

Modificar el endpoint existente de actualizar colaborador (o crear colaborador si el campo `activo` cambia a `false`).

En `ColaboradoresService.update()`:
```typescript
// Si dto.activo === false y colaborador.activo === true:
const equiposPendientes = await this.dataSource.query(`
  SELECT COUNT(*) AS total FROM inventario_ti.asignaciones
  WHERE colaborador_id = @0 AND fecha_devolucion IS NULL
`, [id]);

const perifsActivos = await this.dataSource.query(`
  SELECT COUNT(*) AS total FROM inventario_ti.stock_asignaciones
  WHERE colaborador_id = @0 AND fecha_fin IS NULL
`, [id]);

// Retornar con metadata adicional en la respuesta:
return {
  ...colaboradorActualizado,
  _offboarding: {
    equiposPendientes: equiposPendientes[0].total,
    perifericosPendientes: perifsActivos[0].total,
  }
};
```

El frontend lee `_offboarding` y si `equiposPendientes + perifericosPendientes > 0`, muestra un Modal de confirmación antes de desactivar.

---

## Backend: Asignación Masiva de Periféricos

### DTO

```typescript
// bulk-stock-asignacion.dto.ts
export class BulkStockAsignacionDto {
  @IsInt() modeloId: number;
  @IsInt() cantidad: number;
  @IsDateString() fechaInicio: string;
  @IsArray() @IsInt({ each: true }) @ArrayMaxSize(50)
  colaboradorIds: number[];
  @IsOptional() @IsString() observaciones?: string;
}
```

### Endpoint `POST /api/stock-asignaciones/bulk`

```typescript
async createBulk(dto: BulkStockAsignacionDto, usuarioId: number) {
  // 1. Verificar modelo existe y tieneSerie === false
  // 2. Verificar stock disponible: totalIngresado - totalAsignado >= dto.cantidad * dto.colaboradorIds.length
  // 3. Insertar N registros en stock_asignaciones dentro de una transacción
  // 4. Retornar { creados: N, modeloId, colaboradorIds }
}
```

---

## Backend: Vista por Departamento

Nuevo endpoint `GET /api/asignaciones/por-departamento`:

```sql
SELECT e.gerencia, e.departamento,
       COUNT(a.id) AS totalAsignaciones,
       COUNT(DISTINCT a.colaborador_id) AS colaboradoresConEquipo,
       COUNT(DISTINCT e.id) AS equipos
FROM inventario_ti.asignaciones a
JOIN inventario_ti.equipos e ON e.id = a.equipo_id
WHERE a.fecha_devolucion IS NULL
GROUP BY e.gerencia, e.departamento
ORDER BY e.gerencia, e.departamento
```

Retorna lista agrupada. El frontend la muestra como árbol colapsable.

---

## Frontend

### AsignacionesPage — Cambios

**Tab "Activas"** — agregar Select de filtro por departamento que llama al endpoint `por-departamento` para obtener la lista:

```tsx
<Select placeholder="Filtrar por departamento" allowClear onChange={setFiltroDept} style={{ width: 220 }}>
  {departamentos.map(d => <Option key={d.departamento} value={d.departamento}>{d.departamento} ({d.equipos})</Option>)}
</Select>
```

**Tab "Departamentos"** (nuevo, 5º tab) — tabla con `gerencia`, `departamento`, `equipos`, `colaboradoresConEquipo`, botón "Ver detalle" → filtra tab Activas.

**Botón "Asignación masiva"** (en tab Periféricos activos):
```tsx
<Button icon={<ThunderboltOutlined />} onClick={() => setModalMasivaOpen(true)}>
  Asignación masiva
</Button>
```

Modal `ModalAsignacionMasiva`:
- Select de modelo (tieneSerie=false)
- InputNumber de cantidad
- DatePicker fechaInicio
- `Transfer` de Ant Design para seleccionar colaboradores (lista izquierda → derecha)
- Botón "Asignar a todos" → POST `/stock-asignaciones/bulk`

### ColaboradorDetailPage — Offboarding Alert

En el botón "Desactivar" (o donde se cambia `activo`), tras recibir la respuesta del PATCH:

```tsx
if (res._offboarding?.equiposPendientes > 0 || res._offboarding?.perifericosPendientes > 0) {
  Modal.warning({
    title: '⚠️ Colaborador tiene equipos pendientes de devolución',
    content: `${res._offboarding.equiposPendientes} equipo(s) y ${res._offboarding.perifericosPendientes} periférico(s) sin devolver. Coordinar devolución antes de desvinculación.`,
    okText: 'Entendido',
  });
}
```

### ColaboradorDetailPage y AsignacionesPage — Botón Acta

```tsx
<Button icon={<FilePdfOutlined />} onClick={() => window.open(`/api/asignaciones/acta/${colaboradorId}`)}>
  Acta de entrega
</Button>
```

Visible en:
- `ColaboradorDetailPage` — header del colaborador
- `AsignacionesPage` → tab Colaboradores → cada fila → columna Acciones

---

## Testing

- Backend: `generarActa` retorna Buffer > 0 y Content-Type pdf
- Backend: `createBulk` falla si stock insuficiente para todos los colaboradores
- Backend: `update` colaborador con `activo=false` retorna `_offboarding` con conteos
- Frontend: Modal de offboarding aparece cuando hay equipos pendientes
- Frontend: Modal masiva envía POST con colaboradorIds correcto

---

## Definition of Done

- [ ] `GET /api/asignaciones/acta/:id` retorna PDF válido con equipos y periféricos
- [ ] Botón "Acta de entrega" visible en ColaboradorDetailPage y tab Colaboradores
- [ ] Desactivar colaborador con equipos pendientes muestra modal de advertencia
- [ ] `POST /api/stock-asignaciones/bulk` crea N asignaciones en transacción
- [ ] Modal de asignación masiva con Transfer de colaboradores funciona
- [ ] Tab "Departamentos" en AsignacionesPage muestra agrupación correcta
- [ ] Tests pasan
