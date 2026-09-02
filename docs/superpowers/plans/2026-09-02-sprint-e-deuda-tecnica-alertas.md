# Sprint E — Deuda Técnica + Alertas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix N+1 periféricos + auto-migración en deploy + JWT refresh token + corrección roles frontend + alertas email semanales + notificaciones in-app con campanilla funcional.

**Architecture:** Migración 010 (refresh_tokens + notificaciones). Nuevo `AlertasModule` con cron jobs. Frontend: interceptor axios para refresh silencioso + `useNotificaciones` hook + campanilla con Badge.

**Tech Stack:** NestJS 11, `nodemailer@^6.9.0`, `@nestjs/schedule@^4.0.0`, React 18, Ant Design 5

**Spec:** `docs/superpowers/specs/2026-09-02-sprint-e-deuda-tecnica-alertas-design.md`

## Global Constraints

- Schema `inventario_ti`
- Instalar en backend: `nodemailer@^6.9.0`, `@nestjs/schedule@^4.0.0`, `@types/nodemailer`
- Env vars nuevas (añadir en Easypanel): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Refresh token: hash SHA-256, expiración 30 días, rotación en cada uso
- Polling notificaciones: cada 60 segundos desde el frontend
- Roles de escritura correctos: solo `['ADMIN', 'TI_ADMIN']`

---

### Task 1: Migración 010 + Auto-migración en AppModule

**Files:**
- Create: `apps/backend/src/database/migrations/010-refresh-tokens-notificaciones.ts`
- Modify: `apps/backend/src/app.module.ts` (`onModuleInit` para auto-migración)

- [ ] **Step 1: Crear migración 010**

```typescript
// apps/backend/src/database/migrations/010-refresh-tokens-notificaciones.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokensNotificaciones1685000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='refresh_tokens')
      CREATE TABLE inventario_ti.refresh_tokens (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
        token_hash  NVARCHAR(200) NOT NULL,
        expires_at  DATETIME2 NOT NULL,
        revoked     BIT NOT NULL DEFAULT 0,
        creado_en   DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.refresh_tokens') AND name='IX_rt_usuario')
        CREATE INDEX IX_rt_usuario ON inventario_ti.refresh_tokens(usuario_id)
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.refresh_tokens') AND name='IX_rt_hash')
        CREATE INDEX IX_rt_hash ON inventario_ti.refresh_tokens(token_hash)
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='notificaciones')
      CREATE TABLE inventario_ti.notificaciones (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
        tipo        NVARCHAR(50) NOT NULL,
        titulo      NVARCHAR(200) NOT NULL,
        mensaje     NVARCHAR(1000) NOT NULL,
        leida       BIT NOT NULL DEFAULT 0,
        creado_en   DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.notificaciones') AND name='IX_noti_usuario')
        CREATE INDEX IX_noti_usuario ON inventario_ti.notificaciones(usuario_id, leida)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.notificaciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.refresh_tokens`);
  }
}
```

- [ ] **Step 2: Correr migración contra producción**

```powershell
$env:DB_HOST="soledbserver.database.windows.net"; $env:DB_PORT="1433"
$env:DB_NAME="soledb-puntoventa"; $env:DB_USER="soledbserveradmin"
$env:DB_PASSWORD="@s0le@dm1nAI#82,"; $env:DB_SCHEMA="inventario_ti"
Set-Location apps/backend
..\node_modules\.bin\typeorm-ts-node-commonjs.cmd migration:run -d src/database/data-source.ts
```

- [ ] **Step 3: Agregar auto-migración en `AppModule`**

En `apps/backend/src/app.module.ts`, añadir `OnModuleInit`:

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Module({ /* imports existentes sin cambio */ })
export class AppModule implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    try {
      const pending = await this.dataSource.showMigrations();
      if (pending) {
        console.log('[AppModule] Running pending migrations...');
        await this.dataSource.runMigrations({ transaction: 'each' });
        console.log('[AppModule] Migrations complete.');
      }
    } catch (err) {
      console.error('[AppModule] Migration error (app will still start):', err.message);
      // No lanzar el error — la app debe arrancar aunque las migraciones fallen
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/database/migrations/010-refresh-tokens-notificaciones.ts apps/backend/src/app.module.ts
git commit -m "feat(migrations): 010 refresh_tokens+notificaciones + auto-migración en AppModule.onModuleInit"
```

---

### Task 2: Fix N+1 — Endpoint agregado para periféricos

**Files:**
- Modify: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.service.ts`
- Modify: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.controller.ts`
- Modify: `apps/frontend/src/pages/AsignacionesPage.tsx`

- [ ] **Step 1: Agregar `getActivasAgrupadas()` en `StockAsignacionesService`**

```typescript
async getActivasAgrupadas() {
  const rows = await this.dataSource.query(`
    SELECT sa.colaborador_id,
           CONCAT(c.nombre,' ',c.apellido) AS colaborador,
           c.gerencia, c.departamento,
           sa.id AS asignacionId, sa.modelo_id AS modeloId,
           m.nombre AS modeloNombre, m.tipo, m.codigo AS modeloCodigo,
           sa.cantidad, sa.fecha_inicio AS fechaInicio
    FROM inventario_ti.stock_asignaciones sa
    JOIN inventario_ti.colaboradores c ON c.id=sa.colaborador_id
    JOIN inventario_ti.modelos m ON m.id=sa.modelo_id
    WHERE sa.fecha_fin IS NULL
    ORDER BY c.apellido, c.nombre, sa.fecha_inicio
  `);

  // Agrupar en memoria por colaborador_id
  const map = new Map<number, any>();
  for (const row of rows) {
    if (!map.has(row.colaborador_id)) {
      map.set(row.colaborador_id, {
        colaboradorId: row.colaborador_id,
        colaborador: row.colaborador,
        gerencia: row.gerencia,
        departamento: row.departamento,
        perifericos: [],
      });
    }
    map.get(row.colaborador_id).perifericos.push({
      id: row.asignacionId,
      modeloId: row.modeloId,
      modeloNombre: row.modeloNombre,
      modeloCodigo: row.modeloCodigo,
      tipo: row.tipo,
      cantidad: row.cantidad,
      fechaInicio: row.fechaInicio,
    });
  }
  return Array.from(map.values());
}
```

- [ ] **Step 2: Endpoint `GET /stock-asignaciones/activas-agrupadas`**

```typescript
// IMPORTANTE: esta ruta debe ir ANTES de `:id` en el controller para no colisionar
@Get('activas-agrupadas')
@UseGuards(JwtAuthGuard)
getActivasAgrupadas() { return this.stockAsignacionesService.getActivasAgrupadas(); }
```

- [ ] **Step 3: Refactorizar `TabPerifericosActivos` en `AsignacionesPage.tsx`**

Reemplazar el fan-out de requests por una sola llamada. Leer el componente actual (puede llamarse `TabPerifericosActivos` o similar) y sustituir por:

```tsx
const TabPerifericosActivos: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock-asignaciones/activas-agrupadas');
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const expandedRowRender = (record: any) => (
    <Table
      dataSource={record.perifericos}
      rowKey="id"
      size="small"
      pagination={false}
      columns={[
        { title:'Modelo', dataIndex:'modeloNombre' },
        { title:'Tipo', dataIndex:'tipo', render: t => <Tag>{t}</Tag>, width:120 },
        { title:'Cantidad', dataIndex:'cantidad', width:80, align:'right' },
        { title:'Desde', dataIndex:'fechaInicio', width:110,
          render: d => d ? new Date(d).toLocaleDateString('es-PE') : '—' },
        { title:'', width:80,
          render: (_, row) => (
            <Popconfirm title="¿Devolver este periférico?" onConfirm={async () => {
              await api.patch(`/stock-asignaciones/${row.id}/devolver`, { fechaFin: new Date().toISOString().split('T')[0] });
              cargar();
            }}>
              <Button size="small" danger>Devolver</Button>
            </Popconfirm>
          )
        },
      ]}
    />
  );

  return (
    <Table
      dataSource={data}
      rowKey="colaboradorId"
      loading={loading}
      expandable={{ expandedRowRender }}
      columns={[
        { title:'Colaborador', dataIndex:'colaborador' },
        { title:'Gerencia', dataIndex:'gerencia', width:120 },
        { title:'Departamento', dataIndex:'departamento' },
        { title:'Periféricos', dataIndex:'perifericos', width:100, align:'right',
          render: (p: any[]) => p.length },
      ]}
    />
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/stock-asignaciones/ apps/frontend/src/pages/AsignacionesPage.tsx
git commit -m "fix(N+1): stock-asignaciones activas-agrupadas — 1 query en vez de 699 requests"
```

---

### Task 3: JWT Refresh Token

**Files:**
- Create: `apps/backend/src/modules/auth/entities/refresh-token.entity.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts`
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Modify: `apps/backend/src/modules/auth/auth.module.ts`
- Modify: `apps/frontend/src/services/api.ts`
- Modify: `apps/frontend/src/store/authStore.ts`

- [ ] **Step 1: Crear entidad `RefreshToken`**

```typescript
// apps/backend/src/modules/auth/entities/refresh-token.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'inventario_ti', name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn() id: number;
  @Column() usuarioId: number;
  @Column({ length: 200 }) tokenHash: string;
  @Column() expiresAt: Date;
  @Column({ default: false }) revoked: boolean;
  @CreateDateColumn() creadoEn: Date;
}
```

Registrar en `auth.module.ts`: añadir `TypeOrmModule.forFeature([RefreshToken, ...existentes])`.

- [ ] **Step 2: Modificar `AuthService.login()` y agregar `refresh()` + `logout()`**

Leer el `auth.service.ts` actual. Añadir import de `RefreshToken` y crypto:

```typescript
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// En el constructor, agregar:
@InjectRepository(RefreshToken) private rtRepo: Repository<RefreshToken>,

// Método privado para generar par de tokens:
private async generarTokens(usuario: any) {
  const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
  const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

  const rawToken = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await this.rtRepo.save({ usuarioId: usuario.id, tokenHash: hash, expiresAt, revoked: false });

  return { access_token: accessToken, refresh_token: rawToken, expires_in: 28800 };
}

// En login(), reemplazar el return por:
return this.generarTokens(usuario);

// Nuevo método refresh():
async refresh(rawToken: string) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const rt = await this.rtRepo.findOne({ where: { tokenHash: hash, revoked: false } });
  if (!rt || rt.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token inválido o expirado');
  }
  // Rotar — revocar el actual
  await this.rtRepo.update(rt.id, { revoked: true });
  // Cargar usuario (ajustar según cómo se carga actualmente en el servicio)
  const usuario = await this.usuariosService.findOne(rt.usuarioId);
  return this.generarTokens(usuario);
}

// Nuevo método logout():
async logout(usuarioId: number) {
  await this.rtRepo.update({ usuarioId, revoked: false }, { revoked: true });
  return { message: 'Sesión cerrada' };
}
```

- [ ] **Step 3: Agregar endpoints en `AuthController`**

```typescript
@Post('refresh')
refresh(@Body('refresh_token') token: string) {
  return this.authService.refresh(token);
}

@Post('logout')
@UseGuards(JwtAuthGuard)
logout(@Req() req: any) {
  return this.authService.logout(req.user.userId);
}
```

- [ ] **Step 4: Actualizar `authStore.ts` en el frontend**

Leer el archivo actual. Añadir campos `refreshToken` y `expiresAt`, y método `setTokens`:

```typescript
// En el store de Zustand:
interface AuthState {
  token: string | null;
  refreshToken: string | null;  // NUEVO
  expiresAt: number | null;      // NUEVO — timestamp ms
  // ...resto existente
  setTokens: (access: string, refresh: string, expiresIn: number) => void; // NUEVO
}

// En el store:
setTokens: (access, refresh, expiresIn) => set({
  token: access,
  refreshToken: refresh,
  expiresAt: Date.now() + expiresIn * 1000,
}),

// En login() existente: reemplazar set({ token: ... }) por:
get().setTokens(data.access_token, data.refresh_token, data.expires_in);
```

- [ ] **Step 5: Agregar interceptor en `api.ts`**

Leer el archivo `api.ts` actual. Añadir tras la creación del cliente axios:

```typescript
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

// Interceptor de respuesta para refresh silencioso
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const { refreshToken, logout, setTokens } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(error); }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        setTokens(data.access_token, data.refresh_token, data.expires_in);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/auth/ apps/frontend/src/services/api.ts apps/frontend/src/store/authStore.ts
git commit -m "feat(auth): JWT refresh token con rotación + interceptor axios para refresh silencioso"
```

---

### Task 4: Corrección de roles frontend (C10)

**Files:**
- Modify: varios archivos `.tsx` del frontend

- [ ] **Step 1: Buscar usos incorrectos de GERENTE en roles de escritura**

```bash
cd apps/frontend && grep -rn "GERENTE" src/ --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Corregir cada ocurrencia**

Para cada archivo que contenga `GERENTE` en arrays de roles de botones de crear/editar/asignar/eliminar:

Regla: el rol `GERENTE` solo puede aparecer en permisos de **lectura** (ver datos, descargar reportes).  
Reemplazar `['ADMIN', 'TI_ADMIN', 'GERENTE']` → `['ADMIN', 'TI_ADMIN']` en:
- Botones "Crear", "Nuevo", "Registrar"
- Botones "Editar", "Actualizar"  
- Botones "Eliminar", "Dar de baja"
- Botones "Asignar", "Aprobar"

Si hay un helper de permisos (ej. `hasRole(['ADMIN', 'TI_ADMIN', 'GERENTE'])`), revisar cada uso.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/
git commit -m "fix(roles): eliminar GERENTE de operaciones de escritura — solo ADMIN y TI_ADMIN"
```

---

### Task 5: Alertas por email + Notificaciones in-app

**Files:**
- Create: `apps/backend/src/modules/alertas/alertas.module.ts`
- Create: `apps/backend/src/modules/alertas/alertas.service.ts`
- Create: `apps/backend/src/modules/alertas/email.service.ts`
- Create: `apps/backend/src/modules/alertas/alertas.controller.ts`
- Create: `apps/backend/src/modules/alertas/entities/notificacion.entity.ts`
- Modify: `apps/backend/src/app.module.ts`
- Create: `apps/frontend/src/hooks/useNotificaciones.ts`
- Modify: `apps/frontend/src/layouts/AppLayout.tsx` (o donde esté la campanilla)

- [ ] **Step 1: Instalar nodemailer y @nestjs/schedule**

```bash
cd apps/backend && npm install nodemailer @nestjs/schedule @types/nodemailer
```

- [ ] **Step 2: Entidad `Notificacion`**

```typescript
// apps/backend/src/modules/alertas/entities/notificacion.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ schema: 'inventario_ti', name: 'notificaciones' })
export class Notificacion {
  @PrimaryGeneratedColumn() id: number;
  @Column() usuarioId: number;
  @Column({ length: 50 }) tipo: string;
  @Column({ length: 200 }) titulo: string;
  @Column({ length: 1000 }) mensaje: string;
  @Column({ default: false }) leida: boolean;
  @CreateDateColumn() creadoEn: Date;
}
```

- [ ] **Step 3: `email.service.ts`**

```typescript
// apps/backend/src/modules/alertas/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER) {
      this.logger.warn('SMTP_USER no configurado — email omitido');
      return;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to, subject, html,
      });
      this.logger.log(`Email enviado a ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${to}: ${err.message}`);
    }
  }
}
```

- [ ] **Step 4: `alertas.service.ts`**

```typescript
// apps/backend/src/modules/alertas/alertas.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { EmailService } from './email.service';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectDataSource() private ds: DataSource,
    @InjectRepository(Notificacion) private notiRepo: Repository<Notificacion>,
    private emailService: EmailService,
  ) {}

  // Lunes 8:00 AM — EOS próximos 90 días
  @Cron('0 8 * * 1')
  async alertaEosProximos() {
    this.logger.log('[CRON] Verificando modelos EOS próximos...');
    const modelos = await this.ds.query(`
      SELECT TOP 10 m.nombre, m.tipo, m.marca,
             DATEDIFF(DAY,GETUTCDATE(),m.end_of_support) AS dias
      FROM inventario_ti.modelos m
      WHERE m.end_of_support IS NOT NULL
        AND m.end_of_support <= DATEADD(DAY,90,GETUTCDATE())
        AND m.activo=1
      ORDER BY m.end_of_support ASC
    `);
    if (modelos.length === 0) return;

    const admins = await this.getAdmins();
    const html = `
      <h2>⚠️ ${modelos.length} modelos próximos a fin de soporte (90 días)</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <tr style="background:#1e293b;color:white"><th>Modelo</th><th>Tipo</th><th>Días restantes</th></tr>
        ${modelos.map((m: any) => `<tr><td>${m.nombre}</td><td>${m.tipo}</td><td style="color:${m.dias < 30 ? 'red' : 'orange'}">${m.dias}</td></tr>`).join('')}
      </table>
      <p>Accede al <a href="${process.env.APP_URL ?? 'https://gac-sole-inventario-ti.jppsfv.easypanel.host'}/dashboard">Dashboard</a> para ver el detalle completo.</p>
    `;

    for (const admin of admins) {
      await this.emailService.send(admin.email, `[InventarioTI] ${modelos.length} modelos con EOS próximo`, html);
      await this.notiRepo.save({
        usuarioId: admin.id,
        tipo: 'EOS_PROXIMO',
        titulo: `${modelos.length} modelos con EOS próximo`,
        mensaje: modelos.slice(0, 3).map((m: any) => m.nombre).join(', ') + (modelos.length > 3 ? '...' : ''),
      });
    }
  }

  // Diario 9:00 AM — Stock bajo
  @Cron('0 9 * * *')
  async alertaStockBajo() {
    const items = await this.ds.query(`
      SELECT m.nombre AS modeloNombre, m.tipo,
             ISNULL(SUM(cd.cantidad),0) -
             ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                     WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) AS disponible
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id=m.id
      WHERE m.tiene_serie=0 AND m.activo=1
      GROUP BY m.id, m.nombre, m.tipo
      HAVING ISNULL(SUM(cd.cantidad),0) -
             ISNULL((SELECT SUM(sa.cantidad) FROM inventario_ti.stock_asignaciones sa
                     WHERE sa.modelo_id=m.id AND sa.fecha_fin IS NULL),0) <= 3
    `);
    if (items.length === 0) return;

    const admins = await this.getAdmins();
    const html = `
      <h2>📦 Stock bajo en ${items.length} modelo(s)</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <tr style="background:#1e293b;color:white"><th>Modelo</th><th>Tipo</th><th>Disponible</th></tr>
        ${items.map((i: any) => `<tr><td>${i.modeloNombre}</td><td>${i.tipo}</td><td style="color:${i.disponible <= 0 ? 'red' : 'orange'};font-weight:bold">${i.disponible}</td></tr>`).join('')}
      </table>
    `;

    for (const admin of admins) {
      await this.emailService.send(admin.email, `[InventarioTI] Stock bajo: ${items[0].modeloNombre}${items.length > 1 ? ` y ${items.length - 1} más` : ''}`, html);
      await this.notiRepo.save({
        usuarioId: admin.id,
        tipo: 'STOCK_BAJO',
        titulo: `Stock bajo: ${items.slice(0,2).map((i: any) => i.modeloNombre).join(', ')}`,
        mensaje: `${items.length} modelo(s) con disponible ≤ 3 unidades`,
      });
    }
  }

  private async getAdmins() {
    return this.ds.query(`
      SELECT id, nombre, email FROM inventario_ti.usuarios
      WHERE rol IN ('ADMIN','TI_ADMIN') AND activo=1 AND email IS NOT NULL
    `);
  }

  // Métodos para notificaciones in-app
  async getNoLeidas(usuarioId: number) {
    return this.notiRepo.find({ where: { usuarioId, leida: false }, order: { creadoEn: 'DESC' }, take: 30 });
  }

  async marcarLeida(id: number, usuarioId: number) {
    await this.notiRepo.update({ id, usuarioId }, { leida: true });
    return { ok: true };
  }

  async marcarTodasLeidas(usuarioId: number) {
    await this.notiRepo.update({ usuarioId, leida: false }, { leida: true });
    return { ok: true };
  }
}
```

- [ ] **Step 5: `alertas.controller.ts`**

```typescript
// apps/backend/src/modules/alertas/alertas.controller.ts
import { Controller, Get, Patch, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertasService } from './alertas.service';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class AlertasController {
  constructor(private svc: AlertasService) {}

  @Get() getNoLeidas(@Req() req: any) { return this.svc.getNoLeidas(req.user.userId); }
  @Patch(':id/leer') marcarLeida(@Param('id') id: number, @Req() req: any) { return this.svc.marcarLeida(+id, req.user.userId); }
  @Delete('todas') marcarTodasLeidas(@Req() req: any) { return this.svc.marcarTodasLeidas(req.user.userId); }
}
```

- [ ] **Step 6: `alertas.module.ts` y registrar en AppModule**

```typescript
// apps/backend/src/modules/alertas/alertas.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasService } from './alertas.service';
import { AlertasController } from './alertas.controller';
import { EmailService } from './email.service';
import { Notificacion } from './entities/notificacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion])],
  providers: [AlertasService, EmailService],
  controllers: [AlertasController],
})
export class AlertasModule {}
```

En `app.module.ts`:
- Añadir `ScheduleModule.forRoot()` en imports (una vez, al nivel de raíz): `import { ScheduleModule } from '@nestjs/schedule';`
- Añadir `AlertasModule` en imports

- [ ] **Step 7: Hook `useNotificaciones` en frontend**

```typescript
// apps/frontend/src/hooks/useNotificaciones.ts
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Notificacion { id: number; tipo: string; titulo: string; mensaje: string; leida: boolean; creadoEn: string; }

export function useNotificaciones() {
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get('/notificaciones');
      setNotis(res.data);
    } catch { /* silencioso */ }
  }, []);

  const marcarLeida = async (id: number) => {
    await api.patch(`/notificaciones/${id}/leer`);
    setNotis(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodas = async () => {
    await api.delete('/notificaciones/todas');
    setNotis(prev => prev.map(n => ({ ...n, leida: true })));
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60_000);
    return () => clearInterval(interval);
  }, [cargar]);

  return { notis, noLeidas: notis.filter(n => !n.leida).length, marcarLeida, marcarTodas, cargar };
}
```

- [ ] **Step 8: Campanilla funcional en AppLayout**

Leer el archivo del layout principal (buscar donde está el ícono de campana — puede ser `AppLayout.tsx`, `MainLayout.tsx`, o dentro de `App.tsx`). Sustituir la campana estática por:

```tsx
import { Badge, Popover, List, Button, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotificaciones } from '../hooks/useNotificaciones';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
dayjs.extend(relativeTime); dayjs.locale('es');

// En el componente del layout:
const { notis, noLeidas, marcarLeida, marcarTodas } = useNotificaciones();

const panelContent = (
  <div style={{ width: 320, maxHeight: 400, overflowY:'auto' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e2e8f0', marginBottom:8 }}>
      <Typography.Text strong>Notificaciones ({noLeidas} sin leer)</Typography.Text>
      {noLeidas > 0 && <Button size="small" icon={<CheckOutlined />} type="link" onClick={marcarTodas}>Marcar todas</Button>}
    </div>
    {notis.length === 0
      ? <Typography.Text type="secondary" style={{ padding:16, display:'block', textAlign:'center' }}>Sin notificaciones</Typography.Text>
      : <List dataSource={notis} renderItem={n => (
          <List.Item
            onClick={() => !n.leida && marcarLeida(n.id)}
            style={{ cursor: n.leida ? 'default' : 'pointer', background: n.leida ? 'transparent' : '#eff6ff', padding:'8px 4px', borderRadius:4 }}
          >
            <div style={{ width:'100%' }}>
              <div style={{ fontWeight: n.leida ? 400 : 600, fontSize:13 }}>{n.titulo}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{n.mensaje}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{dayjs(n.creadoEn).fromNow()}</div>
            </div>
          </List.Item>
        )} />
    }
  </div>
);

// Reemplazar la campana estática por:
<Popover content={panelContent} trigger="click" placement="bottomRight">
  <Badge count={noLeidas} size="small" offset={[-2, 2]}>
    <BellOutlined style={{ fontSize: 20, cursor:'pointer' }} />
  </Badge>
</Popover>
```

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/alertas/ apps/backend/src/app.module.ts apps/frontend/src/hooks/useNotificaciones.ts apps/frontend/src/
git commit -m "feat(alertas): email cron EOS+stock-bajo, notificaciones in-app, campanilla con Badge"
```

---

### Task 6: Push, verificación y env vars en Easypanel

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Configurar env vars en Easypanel**

En el panel de Easypanel → Variables de entorno del servicio backend, añadir:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email-ti>
SMTP_PASS=<app-password-gmail>
SMTP_FROM=InventarioTI <ti@mt-industrial.com>
APP_URL=https://gac-sole-inventario-ti.jppsfv.easypanel.host
```

Para Gmail se necesita una "Contraseña de aplicación" (no la contraseña normal). Activar en: Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones.

- [ ] **Step 3: Verificar**

- Login retorna `refresh_token` en la respuesta
- Expirar el access token manualmente (cambiar `expiresIn` a '5s' en dev) → interceptor renueva automáticamente
- Campanilla muestra badge con conteo
- Panel de notificaciones abre y lista items
- Periféricos activos carga en 1 request (verificar en DevTools → Network)
- Botones de escritura ya no muestran GERENTE
- Auto-migración: en los logs de Easypanel debe aparecer `[AppModule] Running pending migrations...` o `Migrations complete.`

- [ ] **Step 4: Tag**

```bash
git tag sprint-e-done
```
