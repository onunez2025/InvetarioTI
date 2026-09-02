# Sprint E — Deuda Técnica + Alertas por Email: Design Spec

**Fecha:** 2026-09-02  
**Estado:** Aprobado para implementación

---

## Objetivo

Resolver la deuda técnica acumulada y agregar alertas automáticas por email:

1. **N+1 fix**: Endpoint agregado para periféricos activos (evita 699 requests simultáneos).
2. **Auto-migración en deploy**: Dockerfile ejecuta `migration:run` antes de iniciar la app.
3. **JWT Refresh Token**: Sesiones no expiran abruptamente.
4. **Corrección de roles frontend** (C10): Arrays de roles correctos en todos los componentes.
5. **Alertas por email**: Envío automático semanal de EOS próximos + alertas inmediatas de stock bajo.
6. **Notificaciones in-app**: Campanilla con badge de alertas no leídas.

## Tech Stack

- Backend: NestJS 11, `nodemailer` (nueva dep), `@nestjs/schedule` (nueva dep para cron)
- Frontend: React 18, Ant Design 5
- Nueva migración: `010-refresh-tokens-notificaciones.ts`

---

## Global Constraints

- Schema: `inventario_ti`
- Email: `nodemailer@^6.9.0` + `@nestjs/schedule@^4.0.0` — instalar en backend
- SMTP config via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Refresh token: hash con `crypto.randomBytes(64).toString('hex')`, expiración 30 días
- Las notificaciones in-app NO usan WebSockets — polling cada 60s desde el frontend
- Roles correctos (C10): solo `['ADMIN', 'TI_ADMIN']` pueden crear/editar; `['ADMIN', 'TI_ADMIN', 'TI_USER']` pueden leer

---

## Migración 010

```sql
-- Class: RefreshTokensNotificaciones1685000000010

-- 1. Tabla refresh_tokens
CREATE TABLE inventario_ti.refresh_tokens (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
  token_hash  NVARCHAR(200) NOT NULL,
  expires_at  DATETIME2 NOT NULL,
  revoked     BIT NOT NULL DEFAULT 0,
  creado_en   DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_rt_usuario ON inventario_ti.refresh_tokens(usuario_id);
CREATE INDEX IX_rt_hash    ON inventario_ti.refresh_tokens(token_hash);

-- 2. Tabla notificaciones
CREATE TABLE inventario_ti.notificaciones (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
  tipo        NVARCHAR(50) NOT NULL,  -- 'EOS_PROXIMO','STOCK_BAJO','DEVOLUCION_PENDIENTE'
  titulo      NVARCHAR(200) NOT NULL,
  mensaje     NVARCHAR(1000) NOT NULL,
  leida       BIT NOT NULL DEFAULT 0,
  creado_en   DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_noti_usuario ON inventario_ti.notificaciones(usuario_id, leida);
```

---

## Fix N+1: Periféricos Activos

### Problema

`TabPerifericosActivos` en `AsignacionesPage.tsx` hace un request HTTP por cada colaborador para cargar sus periféricos. Con 699 colaboradores → 699 requests simultáneos.

### Solución

Nuevo endpoint `GET /api/stock-asignaciones/activas-agrupadas`:

```sql
SELECT sa.colaborador_id,
       CONCAT(c.nombre, ' ', c.apellido) AS colaborador,
       c.gerencia, c.departamento,
       sa.id, sa.modelo_id, m.nombre AS modeloNombre, m.tipo,
       sa.cantidad, sa.fecha_inicio
FROM inventario_ti.stock_asignaciones sa
JOIN inventario_ti.colaboradores c ON c.id = sa.colaborador_id
JOIN inventario_ti.modelos m ON m.id = sa.modelo_id
WHERE sa.fecha_fin IS NULL
ORDER BY c.apellido, c.nombre, sa.fecha_inicio
```

El servicio agrupa en memoria por `colaborador_id`:

```typescript
async getActivasAgrupadas() {
  const rows = await this.dataSource.query(SQL);
  const map = new Map<number, ColaboradorConPerifs>();
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
    map.get(row.colaborador_id)!.perifericos.push({
      id: row.id, modeloId: row.modelo_id, modeloNombre: row.modeloNombre,
      tipo: row.tipo, cantidad: row.cantidad, fechaInicio: row.fecha_inicio,
    });
  }
  return Array.from(map.values());
}
```

### Frontend

`TabPerifericosActivos` en `AsignacionesPage.tsx`: reemplazar el fan-out de requests por una sola llamada a `/stock-asignaciones/activas-agrupadas`.

Renderizar como `Table` con `expandable` — fila principal = colaborador, expandida = lista de periféricos.

---

## Auto-migración en Deploy

### Dockerfile (o startup script de Easypanel)

El backend debe correr migraciones ANTES de iniciar la app. Hay dos enfoques:

**Opción A — Script de inicio en `package.json`:**

```json
"start:prod": "node -e \"require('./dist/database/run-migrations').runMigrations()\" && node dist/main"
```

```typescript
// apps/backend/src/database/run-migrations.ts
import { AppDataSource } from './data-source';
export async function runMigrations() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  console.log('Migrations complete');
}
```

**Opción B — `OnModuleInit` en `AppModule` (recomendada para Easypanel):**

```typescript
// apps/backend/src/app.module.ts — agregar en AppModule:
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) {}
  async onModuleInit() {
    const pending = await this.dataSource.showMigrations();
    if (pending) {
      console.log('[Migrations] Running pending migrations...');
      await this.dataSource.runMigrations();
      console.log('[Migrations] Done.');
    }
  }
}
```

**Usar Opción B** — no requiere cambios en Dockerfile, se integra con el ciclo de vida de NestJS.

---

## JWT Refresh Token

### Backend — AuthModule

#### Entidad `RefreshToken` (tabla ya creada en migración 010)

```typescript
// auth/entities/refresh-token.entity.ts
@Entity({ schema: 'inventario_ti', name: 'refresh_tokens' })
export class RefreshToken {
  @PrimaryGeneratedColumn() id: number;
  @Column() usuarioId: number;
  @Column() tokenHash: string;
  @Column() expiresAt: Date;
  @Column({ default: false }) revoked: boolean;
  @CreateDateColumn() creadoEn: Date;
}
```

#### Cambios en `AuthService`

```typescript
// En login() — además de access_token, generar refresh_token:
async login(usuario: any) {
  const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
  const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

  // Refresh token
  const rawToken = crypto.randomBytes(64).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
  await this.refreshTokenRepo.save({ usuarioId: usuario.id, tokenHash: hash, expiresAt });

  return { access_token: accessToken, refresh_token: rawToken, expires_in: 28800 };
}
```

#### Nuevo endpoint `POST /api/auth/refresh`

```typescript
// Body: { refresh_token: string }
async refresh(rawToken: string) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const rt = await this.refreshTokenRepo.findOne({
    where: { tokenHash: hash, revoked: false }
  });
  if (!rt || rt.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token inválido o expirado');
  }
  // Revocar el token actual (rotación)
  await this.refreshTokenRepo.update(rt.id, { revoked: true });
  // Generar nuevo par
  const usuario = await this.usuariosService.findOne(rt.usuarioId);
  return this.login(usuario);
}
```

#### Endpoint `POST /api/auth/logout`

```typescript
// Revocar todos los refresh tokens del usuario
async logout(usuarioId: number) {
  await this.refreshTokenRepo.update({ usuarioId, revoked: false }, { revoked: true });
}
```

### Frontend — `useAuthStore` (Zustand)

```typescript
// Guardar ambos tokens
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null; // timestamp ms
  // ...
}
```

**Axios interceptor** en `src/services/api.ts`:

```typescript
api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { refreshToken } = useAuthStore.getState();
      if (!refreshToken) { useAuthStore.getState().logout(); return Promise.reject(error); }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token, data.expires_in);
        error.config.headers.Authorization = `Bearer ${data.access_token}`;
        return api(error.config);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Corrección de Roles Frontend (C10)

Buscar en todos los archivos `.tsx` del frontend los arrays de roles en botones de crear/editar y corregir:

Incorrecto: `['ADMIN', 'TI_ADMIN', 'GERENTE']`  
Correcto: `['ADMIN', 'TI_ADMIN']` para operaciones de escritura

Archivos a revisar (grep por `GERENTE`):
- `AsignacionesPage.tsx`
- `ColaboradorDetailPage.tsx`
- `EquipoDetailPage.tsx`
- Cualquier componente con botones "Crear", "Editar", "Eliminar", "Asignar"

El rol `GERENTE` solo debe aparecer en operaciones de **lectura** (visualización de dashboards, reportes de su gerencia).

---

## Alertas por Email

### Backend — `AlertasModule` (nuevo)

```
apps/backend/src/modules/alertas/
  alertas.module.ts
  alertas.service.ts     ← lógica de email + notificaciones in-app
  email.service.ts       ← wrapper de nodemailer
  alertas.controller.ts  ← endpoints notificaciones in-app
```

### `email.service.ts`

```typescript
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async send(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@mt-industrial.com',
      to, subject, html,
    });
  }
}
```

### `alertas.service.ts` — Cron jobs

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AlertasService {

  // Lunes 8:00 AM — Resumen EOS próximos 90 días
  @Cron('0 8 * * 1')
  async alertaEosProximos() {
    const modelos = await this.getEosProximos90();
    if (modelos.length === 0) return;

    const admins = await this.getUsuariosAdmins(); // email de todos los ADMIN y TI_ADMIN
    const html = this.buildEosHtml(modelos);
    for (const admin of admins) {
      await this.emailService.send(admin.email, `[TI] ${modelos.length} modelos próximos a EOS`, html);
    }

    // También crear notificación in-app
    for (const admin of admins) {
      await this.notificacionesRepo.save({
        usuarioId: admin.id,
        tipo: 'EOS_PROXIMO',
        titulo: `${modelos.length} modelos con EOS próximo`,
        mensaje: `${modelos.slice(0,3).map(m => m.nombre).join(', ')}...`,
      });
    }
  }

  // Diario 9:00 AM — Stock bajo (disponible <= 3)
  @Cron('0 9 * * *')
  async alertaStockBajo() {
    const items = await this.getStockBajo(); // modelos tieneSerie=false con disponible <= 3
    if (items.length === 0) return;
    const admins = await this.getUsuariosAdmins();
    const html = this.buildStockBajoHtml(items);
    for (const admin of admins) {
      await this.emailService.send(admin.email, `[TI] Stock bajo en ${items.length} modelo(s)`, html);
      await this.notificacionesRepo.save({
        usuarioId: admin.id,
        tipo: 'STOCK_BAJO',
        titulo: `Stock bajo: ${items[0].modeloNombre}${items.length > 1 ? ` y ${items.length-1} más` : ''}`,
        mensaje: `Disponible: ${items[0].disponible} unidades`,
      });
    }
  }
}
```

SQL stock bajo:
```sql
SELECT m.id AS modeloId, m.nombre AS modeloNombre, m.tipo,
       ISNULL(SUM(cd.cantidad),0) AS totalIngresado,
       ISNULL((SELECT SUM(sa2.cantidad) FROM inventario_ti.stock_asignaciones sa2
               WHERE sa2.modelo_id = m.id AND sa2.fecha_fin IS NULL), 0) AS asignado,
       ISNULL(SUM(cd.cantidad),0) -
       ISNULL((SELECT SUM(sa2.cantidad) FROM inventario_ti.stock_asignaciones sa2
               WHERE sa2.modelo_id = m.id AND sa2.fecha_fin IS NULL), 0) AS disponible
FROM inventario_ti.modelos m
LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id = m.id
WHERE m.tiene_serie = 0 AND m.activo = 1
GROUP BY m.id, m.nombre, m.tipo
HAVING (ISNULL(SUM(cd.cantidad),0) - ...) <= 3
```

### Endpoints notificaciones in-app

```typescript
GET  /api/notificaciones          → lista de notificaciones no leídas del usuario actual
PATCH /api/notificaciones/:id/leer → marcar como leída
DELETE /api/notificaciones/todas  → marcar todas como leídas
```

### Frontend — Campanilla

En el layout principal (donde está el `<Badge>` de la campana):

```typescript
// useNotificaciones.ts — custom hook
export function useNotificaciones() {
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    const data = await notificacionesService.listar();
    setNotis(data);
  }, []);

  // Polling cada 60 segundos
  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60_000);
    return () => clearInterval(interval);
  }, [cargar]);

  return { notis, noLeidas: notis.filter(n => !n.leida).length, cargar };
}
```

```tsx
// En AppLayout.tsx — reemplazar campana estática:
const { notis, noLeidas, cargar } = useNotificaciones();

<Popover
  trigger="click"
  content={<NotificacionesPanel notis={notis} onLeer={async (id) => {
    await notificacionesService.marcarLeida(id);
    cargar();
  }} />}
>
  <Badge count={noLeidas} size="small">
    <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
  </Badge>
</Popover>
```

`NotificacionesPanel`: lista de notificaciones con ícono por tipo, título, mensaje, tiempo relativo (ej: "hace 2h"). Botón "Marcar todas como leídas" arriba.

---

## Testing

- Backend: mock `EmailService.send` → `alertaEosProximos` lo llama cuando hay modelos EOS
- Backend: `POST /auth/refresh` con token válido retorna nuevo par; con inválido retorna 401
- Backend: `POST /auth/refresh` con token ya usado retorna 401 (rotación)
- Backend: `GET /stock-asignaciones/activas-agrupadas` retorna array agrupado
- Frontend: interceptor llama `/auth/refresh` en 401 y reintenta request original

---

## Env Vars nuevas (agregar en Easypanel)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ti@mt-industrial.com
SMTP_PASS=<app-password>
SMTP_FROM=InventarioTI <ti@mt-industrial.com>
```

---

## Definition of Done

- [ ] `GET /stock-asignaciones/activas-agrupadas` resuelve N+1 (1 query, no 699)
- [ ] `AppModule.onModuleInit` corre migraciones automáticamente al iniciar
- [ ] Login retorna `refresh_token` + `expires_in`
- [ ] Interceptor axios renueva token silenciosamente en 401
- [ ] `GERENTE` eliminado de arrays de roles de escritura en frontend
- [ ] Cron EOS lunes 8:00 envía email a admins
- [ ] Cron stock bajo diario 9:00 envía email si disponible ≤ 3
- [ ] Campanilla muestra badge con conteo de no leídas
- [ ] Panel de notificaciones lista y marca como leídas
- [ ] Migración 010 aplicada (refresh_tokens + notificaciones)
- [ ] Tests pasan
