# Sprint C — Compras Pro + Equipos Pro: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Workflow BORRADOR→APROBADO→RECIBIDO en compras + upload adjunto PDF + bulk update equipos + historial de custodia + mantenimientos + etiqueta QR.

**Architecture:** 1 migración nueva (009). Backend: 3 nuevos grupos de endpoints en módulos existentes. Frontend: CheckboxTable en Equipos, Tabs en EquipoDetail.

**Tech Stack:** NestJS 11, TypeORM, `multer`, `qrcode`, `pdfkit`, React 18, Ant Design 5

**Spec:** `docs/superpowers/specs/2026-09-02-sprint-c-compras-equipos-pro-design.md`

## Global Constraints

- Schema `inventario_ti`
- Instalar en backend: `multer@^1.4.5`, `qrcode@^1.5.3`, `pdfkit@^0.14.0` + `@types/multer`, `@types/qrcode`, `@types/pdfkit`
- Tamaño máximo adjunto: 10 MB (PDF, JPG, PNG)
- Storage: `/uploads/compras/{compraId}/adjunto.pdf` en contenedor
- QR URL base: `https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/`
- `synchronize: false` — todos los cambios de BD en migración 009

---

### Task 1: Migración 009

**Files:**
- Create: `apps/backend/src/database/migrations/009-compras-estado-adjuntos-mantenimientos.ts`

- [ ] **Step 1: Crear migración**

```typescript
// apps/backend/src/database/migrations/009-compras-estado-adjuntos-mantenimientos.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComprasEstadoAdjuntosMantenimientos1685000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='estado')
        ALTER TABLE inventario_ti.compras ADD estado NVARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('inventario_ti.compras') AND name='CK_compras_estado')
        ALTER TABLE inventario_ti.compras ADD CONSTRAINT CK_compras_estado CHECK (estado IN ('BORRADOR','APROBADO','RECIBIDO'))
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='adjunto_url')
        ALTER TABLE inventario_ti.compras ADD adjunto_url NVARCHAR(500) NULL
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='mantenimientos')
      CREATE TABLE inventario_ti.mantenimientos (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id    INT NOT NULL REFERENCES inventario_ti.equipos(id),
        tipo         NVARCHAR(20) NOT NULL CHECK (tipo IN ('PREVENTIVO','CORRECTIVO','GARANTIA')),
        fecha_inicio DATE NOT NULL,
        fecha_fin    DATE,
        tecnico      NVARCHAR(150),
        descripcion  NVARCHAR(1000),
        costo        DECIMAL(10,2),
        resultado    NVARCHAR(500),
        creado_por   INT REFERENCES inventario_ti.usuarios(id),
        creado_en    DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.mantenimientos') AND name='IX_mant_equipo')
        CREATE INDEX IX_mant_equipo ON inventario_ti.mantenimientos(equipo_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.mantenimientos`);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_compras_estado')
        ALTER TABLE inventario_ti.compras DROP CONSTRAINT CK_compras_estado
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='estado')
        ALTER TABLE inventario_ti.compras DROP COLUMN estado
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='adjunto_url')
        ALTER TABLE inventario_ti.compras DROP COLUMN adjunto_url
    `);
  }
}
```

- [ ] **Step 2: Correr migración localmente contra producción**

```powershell
$env:DB_HOST="soledbserver.database.windows.net"; $env:DB_PORT="1433"
$env:DB_NAME="soledb-puntoventa"; $env:DB_USER="soledbserveradmin"
$env:DB_PASSWORD="@s0le@dm1nAI#82,"; $env:DB_SCHEMA="inventario_ti"
Set-Location apps/backend
..\node_modules\.bin\typeorm-ts-node-commonjs.cmd migration:run -d src/database/data-source.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/database/migrations/009-compras-estado-adjuntos-mantenimientos.ts
git commit -m "feat(migrations): 009 — compras estado+adjunto, tabla mantenimientos"
```

---

### Task 2: Workflow de Compras (estado + adjunto)

**Files:**
- Modify: `apps/backend/src/modules/compras/entities/compra.entity.ts`
- Modify: `apps/backend/src/modules/compras/compras.service.ts`
- Modify: `apps/backend/src/modules/compras/compras.controller.ts`

**Interfaces:**
- Produces: `PATCH /api/compras/:id/aprobar`, `PATCH /api/compras/:id/recibir`, `POST /api/compras/:id/adjunto`, `GET /api/compras/:id/adjunto`

- [ ] **Step 1: Actualizar entidad `Compra`**

Agregar en `compra.entity.ts`:
```typescript
@Column({ default: 'BORRADOR' })
estado: string;

@Column({ nullable: true })
adjuntoUrl: string;
```

- [ ] **Step 2: Instalar multer**

```bash
cd apps/backend && npm install multer @types/multer
```

- [ ] **Step 3: Agregar métodos en `ComprasService`**

```typescript
async aprobar(id: number, usuarioId: number) {
  const compra = await this.compraRepo.findOneOrFail({ where: { id } });
  if (compra.estado !== 'BORRADOR') throw new BadRequestException('Solo compras en BORRADOR pueden aprobarse');
  compra.estado = 'APROBADO';
  return this.compraRepo.save(compra);
}

async recibirCompra(id: number, usuarioId: number) {
  const compra = await this.compraRepo.findOneOrFail({ where: { id } });
  if (compra.estado !== 'APROBADO') throw new BadRequestException('La compra debe estar APROBADA para marcarla como recibida');
  compra.estado = 'RECIBIDO';
  return this.compraRepo.save(compra);
}

async guardarAdjunto(id: number, file: Express.Multer.File) {
  const fs = require('fs');
  const path = require('path');
  const dir = `/uploads/compras/${id}`;
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'adjunto' + path.extname(file.originalname));
  fs.renameSync(file.path, dest);
  await this.compraRepo.update(id, { adjuntoUrl: dest });
  return { adjuntoUrl: dest };
}
```

En `registrarUnidades()`, agregar al inicio:
```typescript
const compra = await this.compraRepo.findOneOrFail({ where: { id: dto.compraDetalleId } }); // ajustar según estructura actual
// Nota: buscar compra padre del detalle:
const detalle = await this.compraDetalleRepo.findOne({ where: { id: dto.compraDetalleId }, relations: ['compra'] });
if (!detalle?.compra || !['APROBADO','RECIBIDO'].includes(detalle.compra.estado)) {
  throw new BadRequestException('La compra debe estar APROBADA antes de registrar unidades');
}
```

- [ ] **Step 4: Agregar endpoints en `ComprasController`**

```typescript
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Patch(':id/aprobar')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
aprobar(@Param('id') id: number, @Req() req: any) {
  return this.comprasService.aprobar(+id, req.user.userId);
}

@Patch(':id/recibir')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
recibir(@Param('id') id: number, @Req() req: any) {
  return this.comprasService.recibirCompra(+id, req.user.userId);
}

@Post(':id/adjunto')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
@UseInterceptors(FileInterceptor('file', {
  dest: '/tmp/uploads',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    cb(null, ['application/pdf','image/jpeg','image/png'].includes(file.mimetype));
  },
}))
uploadAdjunto(@Param('id') id: number, @UploadedFile() file: Express.Multer.File) {
  return this.comprasService.guardarAdjunto(+id, file);
}

@Get(':id/adjunto')
@UseGuards(JwtAuthGuard)
async getAdjunto(@Param('id') id: number, @Res() res: Response) {
  const compra = await this.comprasService.findOne(+id);
  if (!compra.adjuntoUrl) throw new NotFoundException('Sin adjunto');
  res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'inline' });
  require('fs').createReadStream(compra.adjuntoUrl).pipe(res);
}
```

- [ ] **Step 5: Actualizar `CompraDetailPage.tsx` (frontend)**

Leer el archivo actual de `CompraDetailPage.tsx` y añadir:

1. Badge de estado en el header: `<Tag color={estado==='BORRADOR'?'default':estado==='APROBADO'?'blue':'green'}>{estado}</Tag>`

2. Botones condicionales:
```tsx
{compra.estado === 'BORRADOR' && (
  <Popconfirm title="¿Aprobar esta compra?" onConfirm={aprobar}>
    <Button type="primary">Aprobar</Button>
  </Popconfirm>
)}
{compra.estado === 'APROBADO' && (
  <Popconfirm title="¿Marcar como Recibida?" onConfirm={marcarRecibida}>
    <Button type="primary" icon={<CheckCircleOutlined />}>Marcar Recibida</Button>
  </Popconfirm>
)}
```

3. Sección adjunto:
```tsx
<Card title="Adjunto (Factura / OC)" style={{ marginTop:16 }}>
  {compra.adjuntoUrl
    ? <Button icon={<FilePdfOutlined />} onClick={() => window.open(`/api/compras/${compra.id}/adjunto`)}>Ver adjunto</Button>
    : <Upload customRequest={({ file }) => { /* POST /api/compras/{id}/adjunto con FormData */ }} accept=".pdf,.jpg,.png" maxCount={1}>
        <Button icon={<UploadOutlined />}>Subir factura / OC</Button>
      </Upload>
  }
</Card>
```

La columna "Estado" debe mostrarse también en `ComprasPage.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/compras/ apps/frontend/src/pages/CompraDetailPage.tsx apps/frontend/src/pages/ComprasPage.tsx
git commit -m "feat(compras): workflow BORRADOR→APROBADO→RECIBIDO + upload adjunto PDF"
```

---

### Task 3: Bulk Update + QR Equipos

**Files:**
- Modify: `apps/backend/src/modules/equipos/equipos.service.ts`
- Modify: `apps/backend/src/modules/equipos/equipos.controller.ts`
- Modify: `apps/frontend/src/pages/EquiposPage.tsx`

- [ ] **Step 1: Instalar qrcode y pdfkit**

```bash
cd apps/backend && npm install qrcode pdfkit @types/qrcode @types/pdfkit
```

- [ ] **Step 2: Agregar `bulkUpdateEstado` y `generarQrLabel` en `EquiposService`**

```typescript
// BulkUpdate
async bulkUpdateEstado(ids: number[], estado: string) {
  if (ids.length === 0) return { updated: 0 };
  // TypeORM IN query para SQL Server
  const placeholders = ids.map((_, i) => `@${i+1}`).join(',');
  await this.dataSource.query(
    `UPDATE inventario_ti.equipos SET estado=@0 WHERE id IN (${placeholders})`,
    [estado, ...ids]
  );
  return { updated: ids.length };
}

// QR label
async generarQrLabel(id: number): Promise<Buffer> {
  const QRCode = require('qrcode');
  const PDFDocument = require('pdfkit');
  const equipo = await this.findOne(id);
  const url = `https://gac-sole-inventario-ti.jppsfv.easypanel.host/equipos/${id}`;
  const qrDataUrl: string = await QRCode.toDataURL(url);
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const doc = new PDFDocument({ size: [200, 130], margin: 8 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.font('Helvetica-Bold').fontSize(9).text('MT INDUSTRIAL S.A.C', { align:'center' });
    doc.font('Helvetica').fontSize(8).text(equipo.nombre ?? 'Sin nombre', { align:'center' });
    doc.fontSize(7).text(equipo.serie ?? equipo.codigo ?? '', { align:'center' });
    doc.moveDown(0.3);
    // Centrar imagen QR
    const qrSize = 70;
    const x = (200 - qrSize) / 2;
    doc.image(qrBuffer, x, doc.y, { width: qrSize, height: qrSize });
    doc.end();
  });
}
```

- [ ] **Step 3: Agregar endpoints en `EquiposController`**

```typescript
@Patch('bulk')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
bulkUpdate(@Body() body: { ids: number[]; estado: string }) {
  return this.equiposService.bulkUpdateEstado(body.ids, body.estado);
}

@Get(':id/qr-label')
@UseGuards(JwtAuthGuard)
async qrLabel(@Param('id') id: number, @Res() res: Response) {
  const buf = await this.equiposService.generarQrLabel(+id);
  const equipo = await this.equiposService.findOne(+id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="etiqueta-${equipo.codigo ?? id}.pdf"`,
  });
  res.end(buf);
}
```

- [ ] **Step 4: Agregar selección y toolbar en `EquiposPage.tsx`**

Leer el archivo actual. Añadir:

```tsx
const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
const [bulkEstado, setBulkEstado] = useState<string | null>(null);

// rowSelection para la Table:
const rowSelection = {
  selectedRowKeys: selectedKeys,
  onChange: (keys: any[]) => setSelectedKeys(keys),
};

// Toolbar contextual (mostrar solo cuando selectedKeys.length > 0):
{selectedKeys.length > 0 && (
  <Alert
    message={<>
      <b>{selectedKeys.length}</b> equipos seleccionados &nbsp;
      <Select placeholder="Cambiar estado" style={{ width:160 }} onChange={setBulkEstado}
        options={['ACTIVO','MANTENIMIENTO','BAJA','INACTIVO'].map(e => ({ value:e, label:e }))}
      />
      &nbsp;
      <Button type="primary" size="small" disabled={!bulkEstado} onClick={async () => {
        await api.patch('/equipos/bulk', { ids: selectedKeys, estado: bulkEstado });
        setSelectedKeys([]); setBulkEstado(null); cargarEquipos();
        message.success('Estado actualizado');
      }}>Aplicar</Button>
      &nbsp;
      <Button size="small" onClick={() => setSelectedKeys([])}>Cancelar</Button>
    </>}
    type="info" style={{ marginBottom:12 }}
  />
)}

// Pasar rowSelection a la Table:
<Table rowSelection={rowSelection} ... />
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/equipos/ apps/frontend/src/pages/EquiposPage.tsx
git commit -m "feat(equipos): bulk update estado + etiqueta QR PDF"
```

---

### Task 4: Historial de custodia + Mantenimientos en EquipoDetailPage

**Files:**
- Modify: `apps/backend/src/modules/equipos/equipos.service.ts` (+ historial + mantenimientos)
- Modify: `apps/backend/src/modules/equipos/equipos.controller.ts`
- Create: `apps/backend/src/modules/equipos/entities/mantenimiento.entity.ts`
- Modify: `apps/backend/src/modules/equipos/equipos.module.ts` (registrar entidad)
- Modify: `apps/frontend/src/pages/EquipoDetailPage.tsx`

- [ ] **Step 1: Crear entidad `Mantenimiento`**

```typescript
// apps/backend/src/modules/equipos/entities/mantenimiento.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'inventario_ti', name: 'mantenimientos' })
export class Mantenimiento {
  @PrimaryGeneratedColumn() id: number;
  @Column() equipoId: number;
  @Column() tipo: string;
  @Column({ type: 'date' }) fechaInicio: string;
  @Column({ type: 'date', nullable: true }) fechaFin: string | null;
  @Column({ nullable: true }) tecnico: string;
  @Column({ nullable: true, length: 1000 }) descripcion: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) costo: number;
  @Column({ nullable: true }) resultado: string;
  @Column({ nullable: true }) creadoPor: number;
  @CreateDateColumn() creadoEn: Date;
}
```

En `equipos.module.ts`: añadir `Mantenimiento` a `TypeOrmModule.forFeature([Equipo, Mantenimiento])`.

- [ ] **Step 2: Agregar métodos en `EquiposService`**

```typescript
// Inyectar en constructor:
@InjectRepository(Mantenimiento) private mantenimientoRepo: Repository<Mantenimiento>,

async getHistorial(equipoId: number) {
  return this.dataSource.query(`
    SELECT a.fecha_asignacion, a.fecha_devolucion,
           CONCAT(c.nombre,' ',c.apellido) AS colaborador,
           c.gerencia, c.departamento,
           DATEDIFF(DAY, a.fecha_asignacion, ISNULL(a.fecha_devolucion,GETUTCDATE())) AS dias,
           u.nombre AS registradoPor
    FROM inventario_ti.asignaciones a
    JOIN inventario_ti.colaboradores c ON c.id=a.colaborador_id
    LEFT JOIN inventario_ti.usuarios u ON u.id=a.creado_por
    WHERE a.equipo_id=@0
    ORDER BY a.fecha_asignacion DESC
  `, [equipoId]);
}

async getMantenimientos(equipoId: number) {
  return this.mantenimientoRepo.find({ where: { equipoId }, order: { fechaInicio: 'DESC' } });
}

async createMantenimiento(equipoId: number, dto: any, usuarioId: number) {
  const mant = this.mantenimientoRepo.create({ ...dto, equipoId, creadoPor: usuarioId });
  const saved = await this.mantenimientoRepo.save(mant);
  // Si no tiene fecha_fin → poner equipo en MANTENIMIENTO
  if (!dto.fechaFin) {
    await this.equipoRepo.update(equipoId, { estado: 'MANTENIMIENTO' });
  } else {
    // Si tiene fecha_fin → restaurar a ACTIVO si estaba en MANTENIMIENTO
    const equipo = await this.equipoRepo.findOne({ where: { id: equipoId } });
    if (equipo?.estado === 'MANTENIMIENTO') await this.equipoRepo.update(equipoId, { estado: 'ACTIVO' });
  }
  return saved;
}
```

- [ ] **Step 3: Agregar endpoints en `EquiposController`**

```typescript
@Get(':id/historial')
@UseGuards(JwtAuthGuard)
historial(@Param('id') id: number) { return this.equiposService.getHistorial(+id); }

@Get(':id/mantenimientos')
@UseGuards(JwtAuthGuard)
mantenimientos(@Param('id') id: number) { return this.equiposService.getMantenimientos(+id); }

@Post(':id/mantenimientos')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
createMantenimiento(@Param('id') id: number, @Body() dto: any, @Req() req: any) {
  return this.equiposService.createMantenimiento(+id, dto, req.user.userId);
}
```

- [ ] **Step 4: Convertir `EquipoDetailPage.tsx` en Tabs con 3 pestañas**

Leer el archivo actual. Envolver el contenido existente en un `Tabs` de Ant Design:

```tsx
import { Tabs, Table, Button, Modal, Form, Select, DatePicker, Input, InputNumber } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';

// En el JSX, añadir botón QR en el header:
<Button icon={<QrcodeOutlined />} onClick={() => window.open(`/api/equipos/${id}/qr-label`)}>
  Etiqueta QR
</Button>

// Convertir a Tabs:
<Tabs defaultActiveKey="info" items={[
  { key:'info', label:'Información', children: <>{contenidoActual}</> },
  { key:'historial', label:'Historial', children: <HistorialTab equipoId={id} /> },
  { key:'mantenimientos', label:'Mantenimientos', children: <MantenimientosTab equipoId={id} /> },
]} />
```

`HistorialTab`: tabla con columnas colaborador, desde, hasta, días, área — carga de `GET /api/equipos/:id/historial`.

`MantenimientosTab`: tabla con tipo, fechaInicio, fechaFin, técnico, costo, resultado. Botón "Registrar mantenimiento" abre Modal con Form (tipo Select, fechaInicio DatePicker, tecnico Input, descripcion TextArea, costo InputNumber, fechaFin DatePicker opcional).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/equipos/ apps/frontend/src/pages/EquipoDetailPage.tsx
git commit -m "feat(equipos): historial custodia + mantenimientos en detalle, Tabs layout"
```

---

### Task 5: Push y verificación

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verificar en producción**

- ComprasPage: columna Estado con Tags de colores
- CompraDetail: botones Aprobar/Marcar Recibida visibles según estado
- Upload adjunto PDF funciona y se puede ver
- EquiposPage: checkboxes en tabla, toolbar aparece al seleccionar
- EquipoDetail: 3 tabs — Información, Historial, Mantenimientos
- Botón "Etiqueta QR" abre PDF

- [ ] **Step 3: Tag**

```bash
git tag sprint-c-done
```
