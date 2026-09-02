# Sprint C — Compras Pro + Equipos Pro: Design Spec

**Fecha:** 2026-09-02  
**Estado:** Aprobado para implementación

---

## Objetivo

### Compras Pro
1. **Workflow de estados**: BORRADOR → APROBADO → RECIBIDO (no se pueden registrar unidades hasta estado APROBADO).
2. **Adjuntos**: Subir PDF de factura/OC vinculado a la compra.

### Equipos Pro
3. **Acciones masivas (bulk)**: Seleccionar múltiples equipos → cambiar estado en lote o asignar a colaborador en lote.
4. **Historial completo por equipo**: Cadena de custodia — todos los colaboradores que tuvo un equipo.
5. **Registro de mantenimientos**: Sub-tabla por equipo con intervenciones.
6. **QR / etiqueta imprimible**: PDF con QR codificando la URL del equipo.

## Tech Stack

- Backend: NestJS 11, TypeORM, Azure SQL
- Nuevas dependencias backend: `multer` (upload), `qrcode` (QR generation), `pdfkit` (PDF simple)
- Frontend: React 18, Ant Design 5 — Upload component para adjuntos
- Storage: disco local en `/uploads/compras/` dentro del contenedor (Azure Blob como upgrade path)
- **1 nueva migración**: `009-compras-estado-adjuntos-mantenimientos.ts`

---

## Global Constraints

- Schema: `inventario_ti`
- `synchronize: false` — cambios de BD solo via migración 009
- Nuevas dependencias backend: `multer@^1.4.5`, `qrcode@^1.5.3`, `pdfkit@^0.14.0` + sus `@types/*`
- Tamaño máximo de adjunto: 10 MB (`.pdf`, `.jpg`, `.png` solamente)
- Los archivos se guardan en `/uploads/compras/{compraId}/` dentro del contenedor
- QR URL: `https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/{id}`

---

## Migración 009

```sql
-- Archivo: 009-compras-estado-adjuntos-mantenimientos.ts
-- Class: ComprasEstadoAdjuntosMantenimientos1685000000009

-- 1. Campo estado en compras
ALTER TABLE inventario_ti.compras ADD estado NVARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
  CONSTRAINT CK_compras_estado CHECK (estado IN ('BORRADOR','APROBADO','RECIBIDO'));

-- 2. Campo adjunto_url en compras
ALTER TABLE inventario_ti.compras ADD adjunto_url NVARCHAR(500) NULL;

-- 3. Tabla mantenimientos
CREATE TABLE inventario_ti.mantenimientos (
  id             INT IDENTITY(1,1) PRIMARY KEY,
  equipo_id      INT NOT NULL REFERENCES inventario_ti.equipos(id),
  tipo           NVARCHAR(20) NOT NULL CHECK (tipo IN ('PREVENTIVO','CORRECTIVO','GARANTIA')),
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE,
  tecnico        NVARCHAR(150),
  descripcion    NVARCHAR(1000),
  costo          DECIMAL(10,2),
  resultado      NVARCHAR(500),
  creado_por     INT REFERENCES inventario_ti.usuarios(id),
  creado_en      DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_mant_equipo ON inventario_ti.mantenimientos(equipo_id);
```

---

## Backend: Cambios en Compras

### Entidad `Compra` — agregar campos

```typescript
@Column({ default: 'BORRADOR' })
estado: 'BORRADOR' | 'APROBADO' | 'RECIBIDO';

@Column({ nullable: true })
adjuntoUrl: string;
```

### DTOs nuevos

```typescript
// aprobar-compra.dto.ts — body vacío, solo cambia estado
// recibir-compra.dto.ts — body vacío, solo cambia estado
// upload-adjunto-compra.dto.ts — multipart file
```

### Endpoints nuevos en `ComprasController`

```typescript
// PATCH /api/compras/:id/aprobar — cambia estado BORRADOR→APROBADO
// PATCH /api/compras/:id/recibir — cambia estado APROBADO→RECIBIDO
// POST  /api/compras/:id/adjunto — upload PDF (multer single file)
// GET   /api/compras/:id/adjunto — download el PDF
```

### Regla de negocio en `registrarUnidades`

```typescript
// En ComprasService.registrarUnidades() — agregar al inicio:
if (compra.estado !== 'APROBADO' && compra.estado !== 'RECIBIDO') {
  throw new BadRequestException('La compra debe estar APROBADA antes de registrar unidades');
}
```

### Upload adjunto — `ComprasController`

```typescript
@Post(':id/adjunto')
@UseInterceptors(FileInterceptor('file', {
  dest: '/uploads/compras',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  },
}))
async uploadAdjunto(@Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
  return this.comprasService.guardarAdjunto(id, file);
}
```

`guardarAdjunto` mueve el archivo a `/uploads/compras/{id}/adjunto.pdf` y actualiza `adjunto_url` en BD.

---

## Backend: Acciones Masivas en Equipos

### DTO

```typescript
// bulk-update-equipos.dto.ts
export class BulkUpdateEquiposDto {
  @IsArray() @IsInt({ each: true })
  ids: number[];

  @IsIn(['ACTIVO', 'MANTENIMIENTO', 'BAJA', 'INACTIVO'])
  estado: string;
}
```

### Endpoint `PATCH /api/equipos/bulk`

```typescript
async bulkUpdateEstado(dto: BulkUpdateEquiposDto, usuarioId: number) {
  await this.dataSource.query(
    `UPDATE inventario_ti.equipos SET estado = @0 WHERE id IN (${dto.ids.map(() => '?').join(',')})`,
    [dto.estado, ...dto.ids]
  );
  // registrar en auditoría por cada id
}
```

---

## Backend: Historial por Equipo

Nuevo endpoint `GET /api/equipos/:id/historial`

```sql
SELECT a.fecha_asignacion, a.fecha_devolucion,
       CONCAT(c.nombre, ' ', c.apellido) AS colaborador,
       c.gerencia, c.departamento,
       DATEDIFF(DAY, a.fecha_asignacion, ISNULL(a.fecha_devolucion, GETUTCDATE())) AS dias,
       u.nombre AS registradoPor
FROM inventario_ti.asignaciones a
JOIN inventario_ti.colaboradores c ON c.id = a.colaborador_id
LEFT JOIN inventario_ti.usuarios u ON u.id = a.creado_por
WHERE a.equipo_id = @equipoId
ORDER BY a.fecha_asignacion DESC
```

---

## Backend: Mantenimientos

### Entidad `Mantenimiento`

```typescript
// apps/backend/src/modules/equipos/entities/mantenimiento.entity.ts
@Entity({ schema: 'inventario_ti', name: 'mantenimientos' })
export class Mantenimiento {
  @PrimaryGeneratedColumn() id: number;
  @Column() equipoId: number;
  @Column() tipo: 'PREVENTIVO' | 'CORRECTIVO' | 'GARANTIA';
  @Column({ type: 'date' }) fechaInicio: string;
  @Column({ type: 'date', nullable: true }) fechaFin: string;
  @Column({ nullable: true }) tecnico: string;
  @Column({ nullable: true, length: 1000 }) descripcion: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) costo: number;
  @Column({ nullable: true }) resultado: string;
  @Column({ nullable: true }) creadoPor: number;
  @CreateDateColumn() creadoEn: Date;
}
```

Endpoints (dentro de `EquiposModule`):
- `GET /api/equipos/:id/mantenimientos` — lista
- `POST /api/equipos/:id/mantenimientos` — crear
- `PATCH /api/equipos/:id/mantenimientos/:mid` — editar
- Al crear un mantenimiento con `fechaFin` null → cambiar estado del equipo a `MANTENIMIENTO`
- Al poner `fechaFin` → cambiar estado a `ACTIVO`

---

## Backend: QR / Etiqueta PDF

### Endpoint `GET /api/equipos/:id/qr-label`

Retorna un PDF con:
- Logo "MT INDUSTRIAL" (texto, no imagen)
- Nombre del equipo
- Código / Serie
- QR code que apunta a `https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/{id}`

```typescript
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

async generarQrLabel(id: number): Promise<Buffer> {
  const equipo = await this.findOne(id);
  const qrDataUrl = await QRCode.toDataURL(`https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/${id}`);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const doc = new PDFDocument({ size: [200, 120], margin: 8 });
  const chunks: Buffer[] = [];
  doc.on('data', c => chunks.push(c));
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(9).font('Helvetica-Bold').text('MT INDUSTRIAL', { align: 'center' });
    doc.fontSize(8).font('Helvetica').text(equipo.nombre, { align: 'center' });
    doc.fontSize(7).text(equipo.serie ?? equipo.codigo ?? '', { align: 'center' });
    doc.image(qrBuffer, { fit: [60, 60], align: 'center' });
    doc.end();
  });
}
```

Response headers: `Content-Type: application/pdf`, `Content-Disposition: inline; filename="etiqueta-{codigo}.pdf"`

---

## Frontend

### Compras — cambios en `ComprasPage` y `CompraDetailPage`

**ComprasPage**: columna "Estado" con Tags (`BORRADOR`=gris, `APROBADO`=azul, `RECIBIDO`=verde).

**CompraDetailPage**:
- Badge de estado visible en el header
- Botones condicionales:
  - Si `BORRADOR` → botón "Aprobar" (PATCH aprobar)
  - Si `APROBADO` → botón "Marcar como Recibido" + sección "Registrar unidades" habilitada
  - Si `RECIBIDO` → solo lectura
- Sección "Adjunto": `Upload` de Ant Design, muestra PDF subido si existe, permite descargar

### Equipos — cambios en `EquiposPage`

- Checkboxes en tabla (`rowSelection` de Ant Design)
- Toolbar contextual al seleccionar (aparece cuando `selectedRowKeys.length > 0`):
  ```
  [N seleccionados] [Cambiar estado ▾] [Descargar etiquetas] [Cancelar]
  ```
- Dropdown "Cambiar estado" → llama PATCH `/equipos/bulk`

### EquipoDetailPage — nuevas secciones (tabs)

Convertir la página de detalle en un `Tabs` de Ant Design con:
1. **Información** (actual)
2. **Historial de asignaciones** (tabla con cadena de custodia)
3. **Mantenimientos** (tabla + botón "Registrar mantenimiento")

Botón de etiqueta QR en header:
```tsx
<Button icon={<QrcodeOutlined />} onClick={() => window.open(`/api/equipos/${id}/qr-label`)}>
  Etiqueta QR
</Button>
```

---

## Testing

- Backend: test de `bulkUpdateEstado` con mock de DataSource
- Backend: test de `registrarUnidades` falla cuando `estado === 'BORRADOR'`
- Backend: test de `generarQrLabel` retorna Buffer > 0
- Frontend: checkboxes en tabla seleccionan correctamente, toolbar aparece/desaparece

---

## Definition of Done

- [ ] Migración 009 aplicada en prod (state: BORRADOR/APROBADO/RECIBIDO + tabla mantenimientos)
- [ ] Compras: badges de estado, botones Aprobar/Recibir funcionan
- [ ] Compras: upload adjunto PDF funciona y se puede descargar
- [ ] `registrarUnidades` rechaza compras en estado BORRADOR
- [ ] Equipos: bulk update cambia estado de múltiples equipos
- [ ] EquipoDetailPage: tab Historial muestra cadena de custodia
- [ ] EquipoDetailPage: tab Mantenimientos permite registrar intervenciones
- [ ] Etiqueta QR abre PDF con QR escaneáble
- [ ] Tests pasan
