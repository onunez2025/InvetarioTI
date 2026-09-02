# Sprint D — Asignaciones Pro: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acta de entrega PDF + alerta offboarding + asignación masiva de periféricos + vista por departamento.

**Architecture:** Backend: 3 nuevos endpoints en módulos existentes (asignaciones, stock-asignaciones, colaboradores). Frontend: Modal Transfer para asignación masiva, Tab Departamentos, botones Acta PDF.

**Tech Stack:** NestJS 11, `pdfkit` (ya instalado en Sprint C), React 18, Ant Design 5 `Transfer`

**Spec:** `docs/superpowers/specs/2026-09-02-sprint-d-asignaciones-pro-design.md`

## Global Constraints

- `pdfkit` debe estar instalado (instalado en Sprint C — si no, `npm install pdfkit @types/pdfkit` en backend)
- Schema `inventario_ti`
- Sin nuevas migraciones de BD
- Asignación masiva: máximo 50 colaboradores por request
- El offboarding NO bloquea la operación — es solo una alerta informativa

---

### Task 1: Acta de Entrega PDF

**Files:**
- Modify: `apps/backend/src/modules/asignaciones/asignaciones.service.ts`
- Modify: `apps/backend/src/modules/asignaciones/asignaciones.controller.ts`

**Interfaces:**
- Produces: `GET /api/asignaciones/acta/:colaboradorId` → PDF Buffer

- [ ] **Step 1: Agregar `generarActa()` en `AsignacionesService`**

```typescript
async generarActa(colaboradorId: number, usuarioTi: { nombre?: string }): Promise<Buffer> {
  const PDFDocument = require('pdfkit');

  // 1. Cargar datos del colaborador
  const [colab] = await this.dataSource.query(`
    SELECT nombre, apellido, cargo, gerencia, departamento
    FROM inventario_ti.colaboradores WHERE id=@0
  `, [colaboradorId]);
  if (!colab) throw new NotFoundException('Colaborador no encontrado');

  // 2. Equipos asignados
  const equipos = await this.dataSource.query(`
    SELECT e.nombre AS dispositivo, m.nombre AS modelo, m.tipo,
           e.serie, e.codigo, a.fecha_asignacion
    FROM inventario_ti.asignaciones a
    JOIN inventario_ti.equipos e ON e.id=a.equipo_id
    LEFT JOIN inventario_ti.modelos m ON m.id=e.modelo_id
    WHERE a.colaborador_id=@0 AND a.fecha_devolucion IS NULL
    ORDER BY a.fecha_asignacion
  `, [colaboradorId]);

  // 3. Periféricos asignados
  const perifericos = await this.dataSource.query(`
    SELECT m.nombre AS modelo, m.tipo, sa.cantidad, sa.fecha_inicio
    FROM inventario_ti.stock_asignaciones sa
    JOIN inventario_ti.modelos m ON m.id=sa.modelo_id
    WHERE sa.colaborador_id=@0 AND sa.fecha_fin IS NULL
    ORDER BY sa.fecha_inicio
  `, [colaboradorId]);

  // 4. Generar PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const fechaHoy = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' });

    // Header
    doc.rect(50, 45, 495, 60).fill('#1e293b');
    doc.fill('white').font('Helvetica-Bold').fontSize(14)
       .text('MT INDUSTRIAL S.A.C', 50, 55, { align:'center', width:495 });
    doc.font('Helvetica').fontSize(11)
       .text('ACTA DE ENTREGA DE EQUIPOS TI', 50, 73, { align:'center', width:495 });
    doc.fill('#94a3b8').fontSize(9)
       .text(`Fecha: ${fechaHoy}`, 50, 90, { align:'center', width:495 });

    // Colaborador
    doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11)
       .text('DATOS DEL COLABORADOR', 50, 125);
    doc.fill('#e2e8f0').rect(50, 137, 495, 1).fill();
    doc.fill('#334155').font('Helvetica').fontSize(10);
    doc.text(`Nombre: ${colab.nombre} ${colab.apellido}`, 50, 145);
    doc.text(`Cargo: ${colab.cargo ?? '—'}`, 50, 160);
    doc.text(`Gerencia: ${colab.gerencia ?? '—'}   |   Departamento: ${colab.departamento ?? '—'}`, 50, 175);

    // Equipos
    let y = 205;
    doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11).text('EQUIPOS ASIGNADOS', 50, y); y += 18;
    doc.fill('#e2e8f0').rect(50, y-2, 495, 1).fill();

    // Encabezado tabla
    doc.fill('white').rect(50, y, 495, 16).fill('#1e293b');
    doc.fill('white').font('Helvetica-Bold').fontSize(8)
       .text('DISPOSITIVO', 55, y+4, { width:140 })
       .text('MODELO', 195, y+4, { width:130 })
       .text('SERIE', 325, y+4, { width:100 })
       .text('FECHA', 425, y+4, { width:80 }); y += 16;

    equipos.forEach((e: any, i: number) => {
      const bg = i % 2 === 0 ? '#f8f9fa' : 'white';
      doc.fill(bg).rect(50, y, 495, 14).fill();
      doc.fill('#334155').font('Helvetica').fontSize(8)
         .text(e.dispositivo ?? '', 55, y+3, { width:138 })
         .text(e.modelo ?? '', 195, y+3, { width:128 })
         .text(e.serie ?? e.codigo ?? '', 325, y+3, { width:98 })
         .text(e.fecha_asignacion ? new Date(e.fecha_asignacion).toLocaleDateString('es-PE') : '', 425, y+3, { width:78 });
      y += 14;
    });

    if (equipos.length === 0) {
      doc.fill('#94a3b8').font('Helvetica').fontSize(9).text('Sin equipos asignados', 55, y+3); y += 14;
    }
    y += 12;

    // Periféricos
    if (perifericos.length > 0) {
      doc.fill('#1e293b').font('Helvetica-Bold').fontSize(11).text('PERIFÉRICOS ASIGNADOS', 50, y); y += 18;
      doc.fill('#e2e8f0').rect(50, y-2, 495, 1).fill();
      doc.fill('white').rect(50, y, 495, 16).fill('#1e293b');
      doc.fill('white').font('Helvetica-Bold').fontSize(8)
         .text('MODELO', 55, y+4, { width:220 })
         .text('TIPO', 275, y+4, { width:100 })
         .text('CANTIDAD', 375, y+4, { width:80 })
         .text('DESDE', 455, y+4, { width:80 }); y += 16;
      perifericos.forEach((p: any, i: number) => {
        const bg = i % 2 === 0 ? '#f8f9fa' : 'white';
        doc.fill(bg).rect(50, y, 495, 14).fill();
        doc.fill('#334155').font('Helvetica').fontSize(8)
           .text(p.modelo ?? '', 55, y+3, { width:218 })
           .text(p.tipo ?? '', 275, y+3, { width:98 })
           .text(String(p.cantidad ?? 1), 375, y+3, { width:78 })
           .text(p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-PE') : '', 455, y+3, { width:78 });
        y += 14;
      });
      y += 12;
    }

    // Declaración
    y = Math.max(y, 600);
    doc.fill('#334155').font('Helvetica').fontSize(9).text(
      'El colaborador declara recibir los equipos listados en buen estado y se compromete a conservarlos adecuadamente y devolverlos al término de su vínculo laboral.',
      50, y, { width:495, align:'justify' }
    );
    y += 40;

    // Firmas
    doc.fill('#334155').font('Helvetica').fontSize(9);
    doc.moveTo(70, y).lineTo(230, y).stroke('#1e293b');
    doc.moveTo(330, y).lineTo(490, y).stroke('#1e293b');
    doc.text(`${colab.nombre} ${colab.apellido}`, 70, y+4, { width:160, align:'center' });
    doc.text(usuarioTi.nombre ?? 'Responsable TI', 330, y+4, { width:160, align:'center' });
    doc.fill('#94a3b8').fontSize(8)
       .text('Firma colaborador', 70, y+15, { width:160, align:'center' })
       .text('Firma responsable TI', 330, y+15, { width:160, align:'center' });

    doc.end();
  });
}
```

- [ ] **Step 2: Agregar endpoint en `AsignacionesController`**

```typescript
@Get('acta/:colaboradorId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TI_ADMIN', 'TI_USER')
async actaEntrega(@Param('colaboradorId') id: number, @Req() req: any, @Res() res: Response) {
  const buffer = await this.asignacionesService.generarActa(+id, req.user);
  const fecha = new Date().toISOString().split('T')[0];
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="acta-entrega-${id}-${fecha}.pdf"`,
  });
  res.end(buffer);
}
```

- [ ] **Step 3: Test**

```typescript
it('generarActa retorna Buffer no vacío', async () => {
  // Mock dataSource.query para retornar datos de prueba
  mockDs.query
    .mockResolvedValueOnce([{ nombre:'Juan', apellido:'Pérez', cargo:'Analista', gerencia:'GAC', departamento:'IT' }])
    .mockResolvedValueOnce([]) // equipos vacíos
    .mockResolvedValueOnce([]); // periféricos vacíos
  const buf = await service.generarActa(1, { nombre: 'Admin TI' });
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(100);
});
```

- [ ] **Step 4: Botones Acta en frontend**

En `ColaboradorDetailPage.tsx` — buscar el header del colaborador y añadir:
```tsx
<Button icon={<FilePdfOutlined />} onClick={() => window.open(`/api/asignaciones/acta/${colaboradorId}`)}>
  Acta de entrega
</Button>
```

En `AsignacionesPage.tsx` → tab Colaboradores — añadir en columna Acciones de cada fila:
```tsx
<Button size="small" icon={<FilePdfOutlined />}
  onClick={() => window.open(`/api/asignaciones/acta/${record.colaboradorId}`)}>
  Acta
</Button>
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/asignaciones/ apps/frontend/src/pages/ColaboradorDetailPage.tsx apps/frontend/src/pages/AsignacionesPage.tsx
git commit -m "feat(asignaciones): acta de entrega PDF con equipos y periféricos"
```

---

### Task 2: Offboarding — Alerta de equipos pendientes

**Files:**
- Modify: `apps/backend/src/modules/colaboradores/colaboradores.service.ts`
- Modify: `apps/frontend/src/pages/ColaboradorDetailPage.tsx`

- [ ] **Step 1: Modificar `update()` en `ColaboradoresService`**

Localizar el método `update()`. Añadir ANTES del save, cuando `dto.activo === false`:

```typescript
let offboarding: { equiposPendientes: number; perifericosPendientes: number } | undefined;

if (dto.activo === false && colaborador.activo === true) {
  const [equRow] = await this.dataSource.query(`
    SELECT COUNT(*) AS total FROM inventario_ti.asignaciones
    WHERE colaborador_id=@0 AND fecha_devolucion IS NULL
  `, [id]);
  const [perRow] = await this.dataSource.query(`
    SELECT COUNT(*) AS total FROM inventario_ti.stock_asignaciones
    WHERE colaborador_id=@0 AND fecha_fin IS NULL
  `, [id]);
  offboarding = {
    equiposPendientes: parseInt(equRow.total),
    perifericosPendientes: parseInt(perRow.total),
  };
}

const updated = await this.colaboradorRepo.save({ ...colaborador, ...dto });
return { ...updated, _offboarding: offboarding };
```

- [ ] **Step 2: Manejar `_offboarding` en `ColaboradorDetailPage.tsx`**

Localizar donde se llama al endpoint de actualizar colaborador (botón "Desactivar" o toggle de `activo`). Añadir:

```tsx
const res = await api.patch(`/colaboradores/${colaboradorId}`, { activo: false });
if (res.data._offboarding?.equiposPendientes > 0 || res.data._offboarding?.perifericosPendientes > 0) {
  const { equiposPendientes: eq, perifericosPendientes: per } = res.data._offboarding;
  Modal.warning({
    title: '⚠️ Colaborador con equipos pendientes',
    content: `Este colaborador tiene ${eq > 0 ? `${eq} equipo(s)` : ''} ${per > 0 ? `y ${per} periférico(s)` : ''} sin devolver. Coordina la devolución antes de formalizar la desvinculación.`,
    okText: 'Entendido',
  });
}
cargarColaborador(); // refrescar la vista
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/colaboradores/ apps/frontend/src/pages/ColaboradorDetailPage.tsx
git commit -m "feat(colaboradores): alerta offboarding — equipos pendientes de devolución"
```

---

### Task 3: Asignación masiva de periféricos

**Files:**
- Modify: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.service.ts`
- Modify: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.controller.ts`
- Modify: `apps/frontend/src/pages/AsignacionesPage.tsx`

- [ ] **Step 1: Agregar `createBulk()` en `StockAsignacionesService`**

```typescript
async createBulk(dto: { modeloId:number; cantidad:number; fechaInicio:string; colaboradorIds:number[]; observaciones?:string }, usuarioId: number) {
  if (dto.colaboradorIds.length === 0) throw new BadRequestException('Debe seleccionar al menos un colaborador');
  if (dto.colaboradorIds.length > 50) throw new BadRequestException('Máximo 50 colaboradores por asignación masiva');

  // Verificar modelo
  const modelo = await this.modeloRepo.findOne({ where: { id: dto.modeloId } });
  if (!modelo) throw new NotFoundException('Modelo no encontrado');
  if (modelo.tieneSerie) throw new BadRequestException('Este modelo es serializado — use asignación individual');

  // Verificar stock disponible para todos
  const [stockRow] = await this.dataSource.query(`
    SELECT ISNULL(SUM(cd.cantidad),0) -
           ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                   WHERE sa.modelo_id=@0 AND sa.fecha_fin IS NULL),0) AS disponible
    FROM inventario_ti.compras_detalle cd WHERE cd.modelo_id=@0
  `, [dto.modeloId]);
  const disponible = parseInt(stockRow.disponible);
  const necesario = dto.cantidad * dto.colaboradorIds.length;
  if (disponible < necesario) {
    throw new BadRequestException(`Stock insuficiente. Disponible: ${disponible}, necesario: ${necesario}`);
  }

  // Insertar en transacción
  const registros = dto.colaboradorIds.map(cid => this.stockAsignRepo.create({
    modeloId: dto.modeloId,
    colaboradorId: cid,
    cantidad: dto.cantidad,
    fechaInicio: dto.fechaInicio,
    observaciones: dto.observaciones,
    creadoPor: usuarioId,
  }));

  await this.dataSource.transaction(async manager => {
    await manager.save(registros);
  });

  return { creados: registros.length, modeloId: dto.modeloId };
}
```

- [ ] **Step 2: Agregar endpoint `POST /stock-asignaciones/bulk`**

```typescript
@Post('bulk')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','TI_ADMIN')
createBulk(@Body() dto: any, @Req() req: any) {
  return this.stockAsignacionesService.createBulk(dto, req.user.userId);
}
```

- [ ] **Step 3: Agregar `ModalAsignacionMasiva` en `AsignacionesPage.tsx`**

Leer el archivo actual. Añadir al tab de Periféricos activos:

```tsx
import { Transfer } from 'antd';

// Estado
const [modalMasivaOpen, setModalMasivaOpen] = useState(false);
const [targetKeys, setTargetKeys] = useState<string[]>([]);
const [formMasiva] = Form.useForm();
const [colaboradoresList, setColaboradoresList] = useState<any[]>([]);

// Cargar colaboradores al abrir modal
const abrirModalMasiva = async () => {
  const data = await api.get('/colaboradores?activo=true&limit=500').then(r => r.data.data);
  setColaboradoresList(data.map((c: any) => ({
    key: String(c.id),
    title: `${c.nombre} ${c.apellido}`,
    description: `${c.gerencia} - ${c.departamento}`,
  })));
  setModalMasivaOpen(true);
};

// Modal JSX
<Modal
  title="Asignación masiva de periféricos"
  open={modalMasivaOpen}
  onCancel={() => { setModalMasivaOpen(false); setTargetKeys([]); formMasiva.resetFields(); }}
  onOk={() => formMasiva.submit()}
  width={700}
  okText="Asignar a todos"
>
  <Form form={formMasiva} layout="vertical" onFinish={async values => {
    await api.post('/stock-asignaciones/bulk', {
      modeloId: values.modeloId,
      cantidad: values.cantidad,
      fechaInicio: values.fechaInicio.format('YYYY-MM-DD'),
      colaboradorIds: targetKeys.map(Number),
      observaciones: values.observaciones,
    });
    message.success(`Asignado a ${targetKeys.length} colaboradores`);
    setModalMasivaOpen(false); setTargetKeys([]);
    cargarPerifericos(); // refrescar tab
  }}>
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item name="modeloId" label="Modelo (periférico)" rules={[{ required:true }]}>
          <Select showSearch placeholder="Buscar modelo..." options={modelosSinSerie.map(m => ({ value:m.id, label:`${m.nombre} (${m.tipo})` }))} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item name="cantidad" label="Cantidad" initialValue={1} rules={[{ required:true }]}>
          <InputNumber min={1} max={10} style={{ width:'100%' }} />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item name="fechaInicio" label="Fecha inicio" rules={[{ required:true }]}>
          <DatePicker style={{ width:'100%' }} />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label={`Colaboradores (${targetKeys.length} seleccionados)`}>
      <Transfer
        dataSource={colaboradoresList}
        titles={['Disponibles', 'Seleccionados']}
        targetKeys={targetKeys}
        onChange={setTargetKeys}
        render={item => item.title}
        listStyle={{ width:280, height:300 }}
        showSearch
      />
    </Form.Item>
    <Form.Item name="observaciones" label="Observaciones">
      <Input.TextArea rows={2} />
    </Form.Item>
  </Form>
</Modal>

// Botón que abre el modal (en el toolbar del tab Periféricos):
<Button icon={<ThunderboltOutlined />} onClick={abrirModalMasiva}>
  Asignación masiva
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/stock-asignaciones/ apps/frontend/src/pages/AsignacionesPage.tsx
git commit -m "feat(asignaciones): asignación masiva de periféricos con Transfer de colaboradores"
```

---

### Task 4: Vista por departamento

**Files:**
- Modify: `apps/backend/src/modules/asignaciones/asignaciones.service.ts`
- Modify: `apps/backend/src/modules/asignaciones/asignaciones.controller.ts`
- Modify: `apps/frontend/src/pages/AsignacionesPage.tsx`

- [ ] **Step 1: Agregar `porDepartamento()` en `AsignacionesService`**

```typescript
async porDepartamento() {
  return this.dataSource.query(`
    SELECT e.gerencia, e.departamento,
           COUNT(a.id) AS totalAsignaciones,
           COUNT(DISTINCT a.colaborador_id) AS colaboradoresConEquipo,
           COUNT(DISTINCT a.equipo_id) AS equipos
    FROM inventario_ti.asignaciones a
    JOIN inventario_ti.equipos e ON e.id=a.equipo_id
    WHERE a.fecha_devolucion IS NULL
    GROUP BY e.gerencia, e.departamento
    ORDER BY e.gerencia, e.departamento
  `);
}
```

- [ ] **Step 2: Endpoint `GET /api/asignaciones/por-departamento`**

```typescript
@Get('por-departamento')
@UseGuards(JwtAuthGuard)
porDepartamento() { return this.asignacionesService.porDepartamento(); }
```

- [ ] **Step 3: Agregar Tab "Departamentos" en `AsignacionesPage.tsx`**

Añadir un 5º tab al array de items del Tabs:

```tsx
{
  key: 'departamentos',
  label: <><BankOutlined /> Departamentos</>,
  children: <TabDepartamentos />,
}
```

```tsx
const TabDepartamentos: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/asignaciones/por-departamento').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Table dataSource={data} rowKey={r => `${r.gerencia}-${r.departamento}`} loading={loading} size="small"
      columns={[
        { title:'Gerencia', dataIndex:'gerencia', width:120 },
        { title:'Departamento', dataIndex:'departamento' },
        { title:'Equipos asignados', dataIndex:'equipos', width:140, align:'right' },
        { title:'Colaboradores con equipo', dataIndex:'colaboradoresConEquipo', width:200, align:'right' },
      ]}
    />
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/asignaciones/ apps/frontend/src/pages/AsignacionesPage.tsx
git commit -m "feat(asignaciones): tab Departamentos con agrupación de equipos por área"
```

---

### Task 5: Push y verificación

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verificar**

- `GET /api/asignaciones/acta/1` → descarga PDF con estructura corporativa
- Desactivar un colaborador con equipos → aparece modal de advertencia
- Modal Asignación masiva → Transfer carga colaboradores, submit crea registros
- Tab Departamentos → tabla con agrupación por gerencia/depto

- [ ] **Step 3: Tag**

```bash
git tag sprint-d-done
```
