# Plataforma de Gestión de Inventario TI — Design Spec

**Fecha:** 2026-08-20  
**Empresa:** MT INDUSTRIAL S.A.C.  
**Repositorio:** https://github.com/onunez2025/InvetarioTI.git  
**Estado:** Aprobado

---

## 1. Contexto y Problema

El área de TI de MT INDUSTRIAL S.A.C. gestiona actualmente su inventario de equipos mediante un archivo Excel (`Inventario_General_Equipos_Sole.xlsx`) con 284 equipos registrados. Este enfoque presenta limitaciones críticas:

- Sin control de acceso multi-usuario
- Sin auditoría de cambios (quién cambió qué y cuándo)
- Sin alertas automáticas de fin de ciclo de vida (End of Sale / End of Support)
- Sin integración con sistemas externos (compras, contabilidad)
- Sin capacidad de búsqueda/filtrado avanzado
- Sin dashboards ni reportes ejecutivos

**Objetivo:** Transformar ese Excel en una plataforma web enterprise de gestión de inventario TI que sea escalable, segura y fácil de usar.

---

## 2. Alcance

### Incluido
- Gestión completa de equipos (CRUD)
- Multi-usuario con roles y permisos
- Alertas automáticas de fin de ciclo de vida
- Historial de auditoría de cambios
- Dashboards y reportes exportables (PDF, CSV)
- Integración con sistemas externos vía API
- Importación del Excel inicial

### Fuera de Alcance (MVP v1)
- App móvil nativa (puede agregarse en v2)
- Integración con CMDB (v2)
- Escaneo de QR/códigos de barra (v2)

---

## 3. Arquitectura General

```
USUARIOS FINALES (TI, Departamentos, Ejecutivos, Sistemas Externos)
                          │
          ┌───────────────┼───────────────┐
     Web App (React)   API REST        Webhooks
          │               │                │
          └───────────────┼────────────────┘
                          │
              NestJS Backend (Node.js)
              ├── AuthModule (JWT)
              ├── EquiposModule
              ├── UsuariosModule
              ├── ReportesModule
              ├── AlertasModule
              ├── IntegracionesModule
              └── AuditoriaModule
                          │
          ┌───────────────┼───────────────┐
     SQL Azure          Redis           RabbitMQ
  (soledb-puntoventa)  (Cache)         (Mensajería async)
  Esquema: INV_ZYL
```

---

## 4. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + TypeScript | 18.x |
| Estado | Zustand | 4.x |
| UI Components | Ant Design | 5.x |
| Charts | Recharts | 2.x |
| Backend | NestJS | 10.x |
| ORM | TypeORM | 0.3.x |
| Base de Datos | SQL Azure (soledb-puntoventa) | SQL Server 2022 |
| Esquema BD | INV_ZYL | — |
| Cache | Redis | 7.x |
| Mensajería | RabbitMQ | 3.x |
| Contenedores | Docker | 24.x |
| Orquestación | Kubernetes | 1.28+ |
| CI/CD | GitHub Actions | — |
| Testing Frontend | Jest + React Testing Library + Cypress | — |
| Testing Backend | Jest + Supertest | — |

---

## 5. Modelo de Datos (Esquema INV_ZYL)

### Tabla: `INV_ZYL.equipos`
```sql
CREATE TABLE INV_ZYL.equipos (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    empresa       NVARCHAR(100) NOT NULL,
    nombre        NVARCHAR(150) NOT NULL,
    gerencia      NVARCHAR(100),
    departamento  NVARCHAR(100),
    codigo        NVARCHAR(50),
    ceco          NVARCHAR(100),
    ubicacion     NVARCHAR(150),
    tipo          NVARCHAR(50),           -- SWITCH, SERVIDOR, PC, etc.
    marca         NVARCHAR(100),
    modelo        NVARCHAR(150),
    serie         NVARCHAR(100) UNIQUE,
    firmware      NVARCHAR(100),
    version       NVARCHAR(50),
    end_of_sale   DATE,
    end_of_support DATE,
    estado        NVARCHAR(20) DEFAULT 'ACTIVO',  -- ACTIVO, BAJA, MANTENIMIENTO
    creado_por    INT REFERENCES INV_ZYL.usuarios(id),
    creado_en     DATETIME2 DEFAULT GETUTCDATE(),
    actualizado_en DATETIME2 DEFAULT GETUTCDATE()
);
```

### Tabla: `INV_ZYL.usuarios`
```sql
CREATE TABLE INV_ZYL.usuarios (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(100) NOT NULL,
    email         NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    rol           NVARCHAR(20) NOT NULL,  -- ADMIN, GERENTE, TECNICO, VISUALIZADOR
    departamento  NVARCHAR(100),
    activo        BIT DEFAULT 1,
    creado_en     DATETIME2 DEFAULT GETUTCDATE(),
    ultimo_login  DATETIME2
);
```

### Tabla: `INV_ZYL.asignaciones`
```sql
CREATE TABLE INV_ZYL.asignaciones (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    equipo_id       INT NOT NULL REFERENCES INV_ZYL.equipos(id),
    usuario_id      INT NOT NULL REFERENCES INV_ZYL.usuarios(id),
    fecha_inicio    DATE NOT NULL,
    fecha_fin       DATE,
    observaciones   NVARCHAR(500),
    creado_en       DATETIME2 DEFAULT GETUTCDATE()
);
```

### Tabla: `INV_ZYL.historial_cambios`
```sql
CREATE TABLE INV_ZYL.historial_cambios (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    equipo_id       INT NOT NULL REFERENCES INV_ZYL.equipos(id),
    campo           NVARCHAR(50) NOT NULL,
    valor_anterior  NVARCHAR(MAX),
    valor_nuevo     NVARCHAR(MAX),
    usuario_id      INT REFERENCES INV_ZYL.usuarios(id),
    fecha           DATETIME2 DEFAULT GETUTCDATE()
);
```

### Tabla: `INV_ZYL.alertas`
```sql
CREATE TABLE INV_ZYL.alertas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    equipo_id       INT NOT NULL REFERENCES INV_ZYL.equipos(id),
    tipo            NVARCHAR(30) NOT NULL,  -- END_OF_SALE, END_OF_SUPPORT
    dias_restantes  INT,
    leida           BIT DEFAULT 0,
    creado_en       DATETIME2 DEFAULT GETUTCDATE()
);
```

### Tabla: `INV_ZYL.integraciones_log`
```sql
CREATE TABLE INV_ZYL.integraciones_log (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    tipo            NVARCHAR(50),     -- COMPRAS, CONTABILIDAD, etc.
    metodo          NVARCHAR(10),     -- POST, PUT, etc.
    endpoint        NVARCHAR(255),
    estado          NVARCHAR(20),     -- EXITO, ERROR
    codigo_http     INT,
    respuesta       NVARCHAR(MAX),
    timestamp       DATETIME2 DEFAULT GETUTCDATE()
);
```

---

## 6. Roles y Permisos

| Acción | ADMIN | GERENTE | TECNICO | VISUALIZADOR |
|--------|-------|---------|---------|--------------|
| Ver equipos | ✅ | ✅ | ✅ | ✅ |
| Crear equipo | ✅ | ✅ | ✅ | ❌ |
| Editar equipo | ✅ | ✅ | ✅ | ❌ |
| Eliminar equipo | ✅ | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Ver reportes | ✅ | ✅ | ✅ | ✅ |
| Exportar reportes | ✅ | ✅ | ✅ | ❌ |
| Ver historial | ✅ | ✅ | ✅ | ❌ |
| Gestionar integraciones | ✅ | ❌ | ❌ | ❌ |

---

## 7. API Endpoints Principales

### Autenticación
```
POST   /api/auth/login        → JWT token
POST   /api/auth/refresh      → Nuevo token
POST   /api/auth/logout       → Invalidar token
```

### Equipos
```
GET    /api/equipos           → Lista paginada con filtros
GET    /api/equipos/:id       → Detalle de equipo
POST   /api/equipos           → Crear equipo
PUT    /api/equipos/:id       → Actualizar equipo
DELETE /api/equipos/:id       → Dar de baja equipo
GET    /api/equipos/:id/historial → Historial de cambios
```

### Usuarios
```
GET    /api/usuarios          → Lista (solo ADMIN)
POST   /api/usuarios          → Crear usuario (solo ADMIN)
PUT    /api/usuarios/:id      → Actualizar usuario
DELETE /api/usuarios/:id      → Desactivar usuario (solo ADMIN)
```

### Reportes
```
GET    /api/reportes/dashboard        → Métricas para dashboard
GET    /api/reportes/fin-ciclo-vida   → Equipos próximos a vencer
GET    /api/reportes/por-departamento → Resumen por departamento
GET    /api/reportes/exportar?format=pdf|csv
```

### Alertas
```
GET    /api/alertas           → Alertas activas del usuario
PUT    /api/alertas/:id/leer  → Marcar como leída
```

### Integraciones
```
POST   /api/integraciones/importar-excel → Importación inicial del Excel
POST   /api/integraciones/equipos-nuevos → Para sistemas externos
```

---

## 8. Flujos de Datos Clave

### Lectura de Equipos
```
Frontend GET /api/equipos?page=1&limit=50
→ NestJS valida JWT + permisos
→ Consulta Redis (cache 5 min)
→ Si miss: consulta INV_ZYL.equipos en SQL Azure
→ Almacena en Redis
→ Retorna JSON paginado
```

### Actualización con Auditoría
```
Frontend PUT /api/equipos/:id
→ NestJS valida JWT + permisos
→ TypeORM actualiza INV_ZYL.equipos
→ Auto-inserta en INV_ZYL.historial_cambios
→ Invalida Redis cache
→ Publica evento en RabbitMQ
→ AlertasService verifica fin de ciclo de vida
→ Retorna 200 OK
```

### Alertas Automáticas (Job nocturno)
```
Cron 2:00 AM diario
→ SELECT equipos con end_of_support o end_of_sale dentro de 30 días
→ Para cada uno sin alerta activa: INSERT INV_ZYL.alertas
→ Notifica via WebSocket a usuarios conectados
```

---

## 9. Manejo de Errores

| Nivel | Tipo | Respuesta |
|-------|------|-----------|
| Input | Datos inválidos | 400 Bad Request + detalle |
| Auth | JWT inválido/expirado | 401 Unauthorized |
| Permisos | Acción no permitida | 403 Forbidden |
| Negocio | Recurso no existe | 404 Not Found |
| Negocio | Conflicto de datos | 409 Conflict |
| BD | Timeout/conexión | 504 + retry automático |
| Externa | API externa falla | Log + no bloquea operación |

---

## 10. Seguridad

- **Credenciales:** Variables de entorno en desarrollo; Azure Key Vault en producción
- **Base de datos:** Conexión SSL/TLS forzada, firewall rules en Azure
- **API:** Rate limiting (100 req/min por usuario), CORS configurado, input sanitización
- **JWT:** Access token 1 hora, refresh token 7 días
- **Auditoría:** Todo cambio registrado en `INV_ZYL.historial_cambios`
- **Git:** Credenciales NUNCA en código fuente; `.env` en `.gitignore`

---

## 11. Testing

| Capa | Herramienta | Coverage Objetivo |
|------|-----------|------------------|
| Frontend Unit | Jest + React Testing Library | 80% |
| Frontend E2E | Cypress | Flujos críticos |
| Backend Unit | Jest | 85% |
| Backend E2E | Supertest | Todos los endpoints |
| Performance | k6 | 50 usuarios concurrentes |

---

## 12. CI/CD (GitHub Actions)

```
On push a cualquier branch:
1. Lint (ESLint + Prettier)
2. Unit tests
3. Integration tests (BD de test)
4. Build Docker image
5. Security scan

On merge a main:
1. E2E tests (Cypress)
2. Deploy a staging
3. Smoke tests
4. Aprobación manual
5. Deploy a producción (blue-green)
6. Health checks
```

---

## 13. Estructura de Directorios del Repositorio

```
InvetarioTI/
├── apps/
│   ├── frontend/              # React + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── utils/
│   │   └── package.json
│   └── backend/               # NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── equipos/
│       │   │   ├── usuarios/
│       │   │   ├── reportes/
│       │   │   ├── alertas/
│       │   │   ├── integraciones/
│       │   │   └── auditoria/
│       │   ├── config/
│       │   ├── database/
│       │   │   └── migrations/
│       │   └── main.ts
│       └── package.json
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-08-20-inventario-ti-design.md
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example               # Template de variables de entorno
├── .gitignore
└── README.md
```

---

## 14. Variables de Entorno Requeridas

```env
# Base de Datos (SQL Azure)
DB_HOST=soledbserver.database.windows.net
DB_PORT=1433
DB_NAME=soledb-puntoventa
DB_USER=soledbserveradmin
DB_PASSWORD=<en Azure Key Vault en producción>
DB_SCHEMA=INV_ZYL
DB_SSL=true

# JWT
JWT_SECRET=<generado>
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 15. Hitos de Implementación (6 meses)

| Mes | Entregable |
|-----|-----------|
| Mes 1 | Setup del proyecto, BD (INV_ZYL), Auth, importación Excel |
| Mes 2 | CRUD completo de equipos, historial de auditoría |
| Mes 3 | Usuarios y permisos, dashboard básico |
| Mes 4 | Alertas automáticas, reportes y exportación |
| Mes 5 | Integraciones externas, performance, seguridad |
| Mes 6 | E2E testing, CI/CD completo, deploy producción |

---

*Spec aprobado por el equipo de MT INDUSTRIAL S.A.C. — 2026-08-20*
