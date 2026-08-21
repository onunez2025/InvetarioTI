# Plataforma Inventario TI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una plataforma web enterprise para gestión de inventario TI de MT INDUSTRIAL S.A.C., reemplazando el Excel actual con 284 equipos.

**Architecture:** Monorepo con frontend React 18 + TypeScript y backend NestJS 10 + TypeORM, conectado a SQL Azure (esquema INV_ZYL), Redis para cache y RabbitMQ para mensajería async. Auth con JWT. CI/CD en GitHub Actions.

**Tech Stack:** React 18, TypeScript, Zustand 4, Ant Design 5, Recharts 2, NestJS 10, TypeORM 0.3, SQL Azure (soledb-puntoventa / INV_ZYL), Redis 7, RabbitMQ 3, Docker 24, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-20-inventario-ti-design.md`

## Global Constraints

- Node.js >= 20.x en todos los servicios
- TypeScript strict mode habilitado en frontend y backend
- Esquema de BD: `INV_ZYL` (nunca `dbo`)
- DB_HOST=soledbserver.database.windows.net, DB_NAME=soledb-puntoventa
- SSL/TLS obligatorio en conexión a SQL Azure (encrypt: true, trustServerCertificate: false)
- Credenciales NUNCA en código fuente — siempre variables de entorno
- `.env` en `.gitignore`
- JWT access token expiry: 1h, refresh token: 7d
- Rate limiting: 100 req/min por usuario
- Coverage mínimo: 85% backend, 80% frontend
- Todos los nombres de variables y comentarios en español
- Commits en inglés con prefijos convencionales: feat, fix, test, docs, chore

---

## FASE 1: Setup del Proyecto (Semana 1)

---

### Task 1: Monorepo + Estructura Base + .gitignore + .env.example

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `package.json` (raíz — workspace)

**Interfaces:**
- Produces: estructura de monorepo lista para alojar `apps/backend` y `apps/frontend`

- [ ] **Step 1: Inicializar git y crear estructura de carpetas**

```bash
cd /ruta/al/repo
mkdir -p apps/backend apps/frontend docs/superpowers/{specs,plans} docker .github/workflows
```

- [ ] **Step 2: Crear package.json raíz con workspaces**

Crear `package.json`:
```json
{
  "name": "inventario-ti",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/frontend", "apps/backend"],
  "scripts": {
    "dev:backend": "npm run start:dev --workspace=apps/backend",
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "test:backend": "npm run test --workspace=apps/backend",
    "test:frontend": "npm run test --workspace=apps/frontend"
  }
}
```

- [ ] **Step 3: Crear .gitignore**

Crear `.gitignore`:
```
node_modules/
dist/
build/
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage/
.nyc_output/
```

- [ ] **Step 4: Crear .env.example**

Crear `.env.example`:
```env
# Base de Datos SQL Azure
DB_HOST=soledbserver.database.windows.net
DB_PORT=1433
DB_NAME=soledb-puntoventa
DB_USER=soledbserveradmin
DB_PASSWORD=
DB_SCHEMA=INV_ZYL
DB_SSL=true

# JWT
JWT_SECRET=
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

- [ ] **Step 5: Crear README.md**

Crear `README.md`:
```markdown
# InventarioTI — MT INDUSTRIAL S.A.C.

Plataforma de gestión de inventario TI. Reemplaza el Excel de 284 equipos con una plataforma web enterprise.

## Requisitos
- Node.js 20+
- Docker 24+
- Acceso a SQL Azure (ver .env.example)

## Inicio rápido
\`\`\`bash
cp .env.example .env
# Completar .env con credenciales reales
npm install
npm run dev:backend   # Puerto 3000
npm run dev:frontend  # Puerto 5173
\`\`\`

## Documentación
- Spec: docs/superpowers/specs/2026-08-20-inventario-ti-design.md
- Plan: docs/superpowers/plans/2026-08-21-inventario-ti-plan.md
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: monorepo structure, gitignore, env template, readme"
```

---

### Task 2: Backend NestJS — Scaffold + Conexión SQL Azure

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/main.ts`
- Create: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/config/database.config.ts`
- Create: `apps/backend/.env` (gitignored, copia de .env.example con valores reales)

**Interfaces:**
- Produces: `AppModule` con `TypeOrmModule` conectado a SQL Azure esquema `INV_ZYL`
- Produces: servidor NestJS corriendo en `PORT` (default 3000)

- [ ] **Step 1: Instalar NestJS CLI y scaffold**

```bash
cd apps/backend
npm install --save-dev @nestjs/cli
npx @nestjs/cli new . --package-manager npm --skip-git --strict
```

- [ ] **Step 2: Instalar dependencias de base de datos y configuración**

```bash
cd apps/backend
npm install @nestjs/typeorm typeorm mssql
npm install @nestjs/config
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcryptjs
npm install class-validator class-transformer
npm install @types/bcryptjs @types/passport-jwt --save-dev
```

- [ ] **Step 3: Escribir test de conexión a BD — verificar que falla**

Crear `apps/backend/src/config/database.config.spec.ts`:
```typescript
import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  it('debe retornar configuración con schema INV_ZYL', () => {
    process.env.DB_HOST = 'soledbserver.database.windows.net';
    process.env.DB_PORT = '1433';
    process.env.DB_NAME = 'soledb-puntoventa';
    process.env.DB_USER = 'soledbserveradmin';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_SCHEMA = 'INV_ZYL';

    const config = getDatabaseConfig();

    expect(config.schema).toBe('INV_ZYL');
    expect(config.type).toBe('mssql');
    expect(config.options?.encrypt).toBe(true);
  });
});
```

- [ ] **Step 4: Ejecutar test — debe fallar**

```bash
cd apps/backend
npx jest src/config/database.config.spec.ts
```
Expected: FAIL — `getDatabaseConfig` no existe.

- [ ] **Step 5: Implementar database.config.ts**

Crear `apps/backend/src/config/database.config.ts`:
```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    schema: process.env.DB_SCHEMA ?? 'INV_ZYL',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  };
}
```

- [ ] **Step 6: Actualizar app.module.ts**

Editar `apps/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Ejecutar test — debe pasar**

```bash
cd apps/backend
npx jest src/config/database.config.spec.ts
```
Expected: PASS

- [ ] **Step 8: Verificar que el servidor arranca**

```bash
cd apps/backend
cp ../../.env.example .env
# Editar .env con credenciales reales de SQL Azure
npm run start:dev
```
Expected: `[NestApplication] Nest application successfully started`

- [ ] **Step 9: Commit**

```bash
git add apps/backend/
git commit -m "feat(backend): nestjs scaffold con conexion sql azure"
```

---

## FASE 2: Base de Datos — Migraciones (Semana 1-2)

---

### Task 3: Schema INV_ZYL + Migraciones SQL

**Files:**
- Create: `apps/backend/src/database/migrations/001-create-schema.ts`
- Create: `apps/backend/src/database/migrations/002-create-usuarios.ts`
- Create: `apps/backend/src/database/migrations/003-create-equipos.ts`
- Create: `apps/backend/src/database/migrations/004-create-tablas-secundarias.ts`
- Create: `apps/backend/src/database/data-source.ts`

**Interfaces:**
- Produces: schema `INV_ZYL` con las 6 tablas del spec
- Produces: `DataSource` exportado para uso en migrations CLI

- [ ] **Step 1: Crear data-source.ts para CLI de migraciones**

Crear `apps/backend/src/database/data-source.ts`:
```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA ?? 'INV_ZYL',
  options: { encrypt: true, trustServerCertificate: false },
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
```

- [ ] **Step 2: Agregar scripts de migración en package.json**

Editar `apps/backend/package.json`, agregar en `scripts`:
```json
{
  "migration:run": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/database/data-source.ts",
  "migration:revert": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d src/database/data-source.ts"
}
```

- [ ] **Step 3: Crear migración 001 — schema INV_ZYL**

Crear `apps/backend/src/database/migrations/001-create-schema.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchema1001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'INV_ZYL')
      BEGIN
        EXEC('CREATE SCHEMA INV_ZYL')
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS INV_ZYL`);
  }
}
```

- [ ] **Step 4: Crear migración 002 — tabla usuarios**

Crear `apps/backend/src/database/migrations/002-create-usuarios.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuarios1002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.usuarios (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        nombre        NVARCHAR(100) NOT NULL,
        email         NVARCHAR(150) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        rol           NVARCHAR(20) NOT NULL,
        departamento  NVARCHAR(100),
        activo        BIT DEFAULT 1,
        creado_en     DATETIME2 DEFAULT GETUTCDATE(),
        ultimo_login  DATETIME2
      )
    `);
    // Usuario admin inicial
    await queryRunner.query(`
      INSERT INTO INV_ZYL.usuarios (nombre, email, password_hash, rol)
      VALUES ('Administrador', 'admin@mtindustrial.com',
        '$2b$10$placeholder_hash_change_on_first_login', 'ADMIN')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.usuarios`);
  }
}
```

- [ ] **Step 5: Crear migración 003 — tabla equipos**

Crear `apps/backend/src/database/migrations/003-create-equipos.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipos1003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.equipos (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        empresa        NVARCHAR(100) NOT NULL,
        nombre         NVARCHAR(150) NOT NULL,
        gerencia       NVARCHAR(100),
        departamento   NVARCHAR(100),
        codigo         NVARCHAR(50),
        ceco           NVARCHAR(100),
        ubicacion      NVARCHAR(150),
        tipo           NVARCHAR(50),
        marca          NVARCHAR(100),
        modelo         NVARCHAR(150),
        serie          NVARCHAR(100) UNIQUE,
        firmware       NVARCHAR(100),
        version        NVARCHAR(50),
        end_of_sale    DATE,
        end_of_support DATE,
        estado         NVARCHAR(20) DEFAULT 'ACTIVO',
        creado_por     INT REFERENCES INV_ZYL.usuarios(id),
        creado_en      DATETIME2 DEFAULT GETUTCDATE(),
        actualizado_en DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IX_equipos_tipo ON INV_ZYL.equipos(tipo);
      CREATE INDEX IX_equipos_departamento ON INV_ZYL.equipos(departamento);
      CREATE INDEX IX_equipos_end_of_support ON INV_ZYL.equipos(end_of_support);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.equipos`);
  }
}
```

- [ ] **Step 6: Crear migración 004 — tablas secundarias**

Crear `apps/backend/src/database/migrations/004-create-tablas-secundarias.ts`:
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTablasSecundarias1004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.asignaciones (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id     INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        usuario_id    INT NOT NULL REFERENCES INV_ZYL.usuarios(id),
        fecha_inicio  DATE NOT NULL,
        fecha_fin     DATE,
        observaciones NVARCHAR(500),
        creado_en     DATETIME2 DEFAULT GETUTCDATE()
      );

      CREATE TABLE INV_ZYL.historial_cambios (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id      INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        campo          NVARCHAR(50) NOT NULL,
        valor_anterior NVARCHAR(MAX),
        valor_nuevo    NVARCHAR(MAX),
        usuario_id     INT REFERENCES INV_ZYL.usuarios(id),
        fecha          DATETIME2 DEFAULT GETUTCDATE()
      );

      CREATE TABLE INV_ZYL.alertas (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id      INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        tipo           NVARCHAR(30) NOT NULL,
        dias_restantes INT,
        leida          BIT DEFAULT 0,
        creado_en      DATETIME2 DEFAULT GETUTCDATE()
      );

      CREATE TABLE INV_ZYL.integraciones_log (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        tipo        NVARCHAR(50),
        metodo      NVARCHAR(10),
        endpoint    NVARCHAR(255),
        estado      NVARCHAR(20),
        codigo_http INT,
        respuesta   NVARCHAR(MAX),
        timestamp   DATETIME2 DEFAULT GETUTCDATE()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS INV_ZYL.integraciones_log;
      DROP TABLE IF EXISTS INV_ZYL.alertas;
      DROP TABLE IF EXISTS INV_ZYL.historial_cambios;
      DROP TABLE IF EXISTS INV_ZYL.asignaciones;
    `);
  }
}
```

- [ ] **Step 7: Ejecutar migraciones**

```bash
cd apps/backend
npm run migration:run
```
Expected: 4 migraciones ejecutadas sin errores.

- [ ] **Step 8: Verificar en SQL Azure que las tablas existen**

```bash
# Con sqlcmd o Azure Data Studio:
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'INV_ZYL'
ORDER BY TABLE_NAME;
```
Expected: 6 tablas listadas.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/database/
git commit -m "feat(db): migraciones schema INV_ZYL con 6 tablas"
```

---

## FASE 3: Auth Module (Semana 2)

---

### Task 4: AuthModule — Login, JWT, Refresh, Guards

**Files:**
- Create: `apps/backend/src/modules/auth/auth.module.ts`
- Create: `apps/backend/src/modules/auth/auth.service.ts`
- Create: `apps/backend/src/modules/auth/auth.controller.ts`
- Create: `apps/backend/src/modules/auth/jwt.strategy.ts`
- Create: `apps/backend/src/modules/auth/jwt-auth.guard.ts`
- Create: `apps/backend/src/modules/auth/roles.guard.ts`
- Create: `apps/backend/src/modules/auth/dto/login.dto.ts`
- Create: `apps/backend/src/modules/usuarios/entities/usuario.entity.ts`
- Test: `apps/backend/src/modules/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `Usuario` entity de Task 3 (tabla `INV_ZYL.usuarios`)
- Produces: `AuthService.login(email, password): Promise<{access_token, refresh_token}>`
- Produces: `JwtAuthGuard` — decorator para proteger rutas
- Produces: `RolesGuard` + `@Roles('ADMIN','GERENTE',...)` decorator
- Produces: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`

- [ ] **Step 1: Crear entidad Usuario**

Crear `apps/backend/src/modules/usuarios/entities/usuario.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type RolUsuario = 'ADMIN' | 'GERENTE' | 'TECNICO' | 'VISUALIZADOR';

@Entity({ name: 'usuarios', schema: 'INV_ZYL' })
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 20 })
  rol: RolUsuario;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @Column({ name: 'ultimo_login', nullable: true })
  ultimoLogin: Date;
}
```

- [ ] **Step 2: Crear DTO de login**

Crear `apps/backend/src/modules/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Contraseña mínimo 6 caracteres' })
  password: string;
}
```

- [ ] **Step 3: Escribir tests del AuthService — verificar que fallan**

Crear `apps/backend/src/modules/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as bcrypt from 'bcryptjs';

const mockUsuario: Usuario = {
  id: 1,
  nombre: 'Admin',
  email: 'admin@test.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  rol: 'ADMIN',
  departamento: 'TI',
  activo: true,
  creadoEn: new Date(),
  ultimoLogin: null,
};

describe('AuthService', () => {
  let service: AuthService;

  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('token_jwt_mock'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe retornar tokens si credenciales son válidas', async () => {
    mockRepo.findOne.mockResolvedValue(mockUsuario);
    const result = await service.login('admin@test.com', 'password123');
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).toBeDefined();
  });

  it('debe lanzar UnauthorizedException si email no existe', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.login('noexiste@test.com', 'pass')).rejects.toThrow();
  });

  it('debe lanzar UnauthorizedException si contraseña incorrecta', async () => {
    mockRepo.findOne.mockResolvedValue(mockUsuario);
    await expect(service.login('admin@test.com', 'wrongpass')).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Ejecutar tests — deben fallar**

```bash
cd apps/backend
npx jest src/modules/auth/auth.service.spec.ts
```
Expected: FAIL — `AuthService` no existe.

- [ ] **Step 5: Implementar AuthService**

Crear `apps/backend/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
    const usuario = await this.usuarioRepo.findOne({ where: { email, activo: true } });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usuarioRepo.save({ ...usuario, ultimoLogin: new Date() });

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '1h' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async validarUsuario(id: number): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { id, activo: true } });
  }
}
```

- [ ] **Step 6: Crear jwt.strategy.ts**

Crear `apps/backend/src/modules/auth/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'changeme',
    });
  }

  async validate(payload: { sub: number; email: string; rol: string }) {
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}
```

- [ ] **Step 7: Crear guards**

Crear `apps/backend/src/modules/auth/jwt-auth.guard.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Crear `apps/backend/src/modules/auth/roles.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata('roles', roles, descriptor?.value ?? target);
    return descriptor ?? target;
  };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.get<string[]>('roles', context.getHandler());
    if (!rolesRequeridos) return true;
    const { user } = context.switchToHttp().getRequest();
    return rolesRequeridos.includes(user?.rol);
  }
}
```

- [ ] **Step 8: Crear AuthController**

Crear `apps/backend/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }
}
```

- [ ] **Step 9: Crear AuthModule**

Crear `apps/backend/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'changeme',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 10: Registrar AuthModule en AppModule**

Editar `apps/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 11: Ejecutar tests — deben pasar**

```bash
cd apps/backend
npx jest src/modules/auth/auth.service.spec.ts
```
Expected: PASS (3 tests)

- [ ] **Step 12: Probar endpoint manualmente**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtindustrial.com","password":"Admin123!"}'
```
Expected: `{"access_token":"eyJ...","refresh_token":"eyJ..."}`

- [ ] **Step 13: Commit**

```bash
git add apps/backend/src/modules/auth/ apps/backend/src/modules/usuarios/entities/
git commit -m "feat(auth): jwt login, guards de roles, estrategia passport"
```

---

## FASE 4: Módulo Equipos CRUD (Semana 2-3)

---

### Task 5: EquiposModule — Entidad, DTOs, Service, Controller

**Files:**
- Create: `apps/backend/src/modules/equipos/entities/equipo.entity.ts`
- Create: `apps/backend/src/modules/equipos/dto/create-equipo.dto.ts`
- Create: `apps/backend/src/modules/equipos/dto/update-equipo.dto.ts`
- Create: `apps/backend/src/modules/equipos/dto/filtro-equipos.dto.ts`
- Create: `apps/backend/src/modules/equipos/equipos.service.ts`
- Create: `apps/backend/src/modules/equipos/equipos.controller.ts`
- Create: `apps/backend/src/modules/equipos/equipos.module.ts`
- Test: `apps/backend/src/modules/equipos/equipos.service.spec.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard`, `RolesGuard`, `Roles` de Task 4
- Produces: `EquiposService.findAll(filtros, page, limit): Promise<{data, total}>`
- Produces: `EquiposService.findOne(id): Promise<Equipo>`
- Produces: `EquiposService.create(dto, usuarioId): Promise<Equipo>`
- Produces: `EquiposService.update(id, dto, usuarioId): Promise<Equipo>`
- Produces: `EquiposService.remove(id): Promise<void>`
- Produces: endpoints `GET/POST/PUT/DELETE /api/equipos`

- [ ] **Step 1: Crear entidad Equipo**

Crear `apps/backend/src/modules/equipos/entities/equipo.entity.ts`:
```typescript
import {
  Entity, Column, PrimaryGeneratedColumn,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type EstadoEquipo = 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';

@Entity({ name: 'equipos', schema: 'INV_ZYL' })
export class Equipo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  empresa: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 100, nullable: true })
  gerencia: string;

  @Column({ length: 100, nullable: true })
  departamento: string;

  @Column({ length: 50, nullable: true })
  codigo: string;

  @Column({ length: 100, nullable: true })
  ceco: string;

  @Column({ length: 150, nullable: true })
  ubicacion: string;

  @Column({ length: 50, nullable: true })
  tipo: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  @Column({ length: 150, nullable: true })
  modelo: string;

  @Column({ length: 100, nullable: true, unique: true })
  serie: string;

  @Column({ length: 100, nullable: true })
  firmware: string;

  @Column({ length: 50, nullable: true })
  version: string;

  @Column({ name: 'end_of_sale', type: 'date', nullable: true })
  endOfSale: Date;

  @Column({ name: 'end_of_support', type: 'date', nullable: true })
  endOfSupport: Date;

  @Column({ length: 20, default: 'ACTIVO' })
  estado: EstadoEquipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
```

- [ ] **Step 2: Crear DTOs**

Crear `apps/backend/src/modules/equipos/dto/create-equipo.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateEquipoDto {
  @IsString() @IsNotEmpty()
  empresa: string;

  @IsString() @IsNotEmpty()
  nombre: string;

  @IsString() @IsOptional()
  gerencia?: string;

  @IsString() @IsOptional()
  departamento?: string;

  @IsString() @IsOptional()
  codigo?: string;

  @IsString() @IsOptional()
  ceco?: string;

  @IsString() @IsOptional()
  ubicacion?: string;

  @IsString() @IsOptional()
  tipo?: string;

  @IsString() @IsOptional()
  marca?: string;

  @IsString() @IsOptional()
  modelo?: string;

  @IsString() @IsOptional()
  serie?: string;

  @IsString() @IsOptional()
  firmware?: string;

  @IsString() @IsOptional()
  version?: string;

  @IsDateString() @IsOptional()
  endOfSale?: string;

  @IsDateString() @IsOptional()
  endOfSupport?: string;

  @IsIn(['ACTIVO', 'BAJA', 'MANTENIMIENTO']) @IsOptional()
  estado?: string;
}
```

Crear `apps/backend/src/modules/equipos/dto/update-equipo.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoDto } from './create-equipo.dto';

export class UpdateEquipoDto extends PartialType(CreateEquipoDto) {}
```

Crear `apps/backend/src/modules/equipos/dto/filtro-equipos.dto.ts`:
```typescript
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltroEquiposDto {
  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsString()
  departamento?: string;

  @IsOptional() @IsString()
  ubicacion?: string;

  @IsOptional() @IsString()
  estado?: string;

  @IsOptional() @IsString()
  busqueda?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 50;
}
```

- [ ] **Step 3: Escribir tests del EquiposService — verificar que fallan**

Crear `apps/backend/src/modules/equipos/equipos.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EquiposService } from './equipos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equipo } from './entities/equipo.entity';
import { NotFoundException } from '@nestjs/common';

const mockEquipo: Partial<Equipo> = {
  id: 1, empresa: 'MT INDUSTRIAL', nombre: 'CORE1-SOLE',
  tipo: 'SWITCH', estado: 'ACTIVO',
};

describe('EquiposService', () => {
  let service: EquiposService;
  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: getRepositoryToken(Equipo), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<EquiposService>(EquiposService);
  });

  it('findAll debe retornar datos paginados', async () => {
    mockRepo.findAndCount.mockResolvedValue([[mockEquipo], 1]);
    const result = await service.findAll({}, 1, 50);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('findOne debe lanzar NotFoundException si no existe', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create debe guardar y retornar el equipo', async () => {
    mockRepo.create.mockReturnValue(mockEquipo);
    mockRepo.save.mockResolvedValue(mockEquipo);
    const result = await service.create({ empresa: 'MT INDUSTRIAL', nombre: 'CORE1' } as any, 1);
    expect(result).toEqual(mockEquipo);
  });
});
```

- [ ] **Step 4: Ejecutar tests — deben fallar**

```bash
cd apps/backend
npx jest src/modules/equipos/equipos.service.spec.ts
```
Expected: FAIL

- [ ] **Step 5: Implementar EquiposService**

Crear `apps/backend/src/modules/equipos/equipos.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Equipo } from './entities/equipo.entity';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { FiltroEquiposDto } from './dto/filtro-equipos.dto';

@Injectable()
export class EquiposService {
  constructor(
    @InjectRepository(Equipo)
    private readonly equipoRepo: Repository<Equipo>,
  ) {}

  async findAll(filtros: FiltroEquiposDto, page = 1, limit = 50): Promise<{ data: Equipo[]; total: number }> {
    const where: FindOptionsWhere<Equipo> = {};
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.departamento) where.departamento = filtros.departamento;
    if (filtros.ubicacion) where.ubicacion = filtros.ubicacion;
    if (filtros.estado) where.estado = filtros.estado as any;
    if (filtros.busqueda) where.nombre = Like(`%${filtros.busqueda}%`);

    const [data, total] = await this.equipoRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { nombre: 'ASC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Equipo> {
    const equipo = await this.equipoRepo.findOne({ where: { id } });
    if (!equipo) throw new NotFoundException(`Equipo con id ${id} no encontrado`);
    return equipo;
  }

  async create(dto: CreateEquipoDto, usuarioId: number): Promise<Equipo> {
    const equipo = this.equipoRepo.create({
      ...dto,
      creadoPor: { id: usuarioId } as any,
    });
    return this.equipoRepo.save(equipo);
  }

  async update(id: number, dto: UpdateEquipoDto, usuarioId: number): Promise<Equipo> {
    const equipo = await this.findOne(id);
    Object.assign(equipo, dto);
    return this.equipoRepo.save(equipo);
  }

  async remove(id: number): Promise<void> {
    const equipo = await this.findOne(id);
    equipo.estado = 'BAJA';
    await this.equipoRepo.save(equipo);
  }
}
```

- [ ] **Step 6: Crear EquiposController**

Crear `apps/backend/src/modules/equipos/equipos.controller.ts`:
```typescript
import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseIntPipe,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { FiltroEquiposDto } from './dto/filtro-equipos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/equipos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Get()
  findAll(@Query() filtros: FiltroEquiposDto) {
    const { page, limit, ...resto } = filtros;
    return this.equiposService.findAll(resto, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  create(@Body() dto: CreateEquipoDto, @Request() req: any) {
    return this.equiposService.create(dto, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEquipoDto, @Request() req: any) {
    return this.equiposService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.remove(id);
  }
}
```

- [ ] **Step 7: Crear EquiposModule y registrar en AppModule**

Crear `apps/backend/src/modules/equipos/equipos.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from './entities/equipo.entity';
import { EquiposService } from './equipos.service';
import { EquiposController } from './equipos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo])],
  providers: [EquiposService],
  controllers: [EquiposController],
  exports: [EquiposService],
})
export class EquiposModule {}
```

Editar `apps/backend/src/app.module.ts` para agregar `EquiposModule` en imports.

- [ ] **Step 8: Ejecutar tests — deben pasar**

```bash
cd apps/backend
npx jest src/modules/equipos/equipos.service.spec.ts
```
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/equipos/
git commit -m "feat(equipos): crud completo con filtros y paginacion"
```

---

### Task 6: Historial de Auditoría — Registro Automático de Cambios

**Files:**
- Create: `apps/backend/src/modules/auditoria/entities/historial-cambio.entity.ts`
- Create: `apps/backend/src/modules/auditoria/auditoria.service.ts`
- Create: `apps/backend/src/modules/auditoria/auditoria.module.ts`
- Modify: `apps/backend/src/modules/equipos/equipos.service.ts` (inyectar AuditoriaService)
- Test: `apps/backend/src/modules/auditoria/auditoria.service.spec.ts`

**Interfaces:**
- Consumes: `Equipo` entity, `Usuario` entity
- Produces: `AuditoriaService.registrarCambios(equipoId, anterior, nuevo, usuarioId): Promise<void>`
- Produces: `GET /api/equipos/:id/historial`

- [ ] **Step 1: Crear entidad HistorialCambio**

Crear `apps/backend/src/modules/auditoria/entities/historial-cambio.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'historial_cambios', schema: 'INV_ZYL' })
export class HistorialCambio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @Column({ length: 50 })
  campo: string;

  @Column({ name: 'valor_anterior', type: 'nvarchar', nullable: true })
  valorAnterior: string;

  @Column({ name: 'valor_nuevo', type: 'nvarchar', nullable: true })
  valorNuevo: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @CreateDateColumn()
  fecha: Date;
}
```

- [ ] **Step 2: Escribir test de AuditoriaService — verificar que falla**

Crear `apps/backend/src/modules/auditoria/auditoria.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistorialCambio } from './entities/historial-cambio.entity';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  const mockRepo = { save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: getRepositoryToken(HistorialCambio), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('debe registrar cambios entre dos versiones de un equipo', async () => {
    mockRepo.save.mockResolvedValue({});
    const anterior = { nombre: 'CORE1', estado: 'ACTIVO' };
    const nuevo = { nombre: 'CORE1-SOLE', estado: 'ACTIVO' };
    await service.registrarCambios(1, anterior as any, nuevo as any, 1);
    // Solo debe guardar el campo que cambió: 'nombre'
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('no debe registrar nada si no hay cambios', async () => {
    mockRepo.save.mockClear();
    const mismo = { nombre: 'CORE1', estado: 'ACTIVO' };
    await service.registrarCambios(1, mismo as any, mismo as any, 1);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Ejecutar tests — deben fallar**

```bash
npx jest src/modules/auditoria/auditoria.service.spec.ts
```
Expected: FAIL

- [ ] **Step 4: Implementar AuditoriaService**

Crear `apps/backend/src/modules/auditoria/auditoria.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialCambio } from './entities/historial-cambio.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

const CAMPOS_AUDITADOS: (keyof Equipo)[] = [
  'nombre', 'empresa', 'gerencia', 'departamento', 'ubicacion',
  'tipo', 'marca', 'modelo', 'serie', 'firmware', 'version',
  'endOfSale', 'endOfSupport', 'estado', 'codigo', 'ceco',
];

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(HistorialCambio)
    private readonly historialRepo: Repository<HistorialCambio>,
  ) {}

  async registrarCambios(equipoId: number, anterior: Equipo, nuevo: Equipo, usuarioId: number): Promise<void> {
    const cambios: Partial<HistorialCambio>[] = [];

    for (const campo of CAMPOS_AUDITADOS) {
      const valorAnterior = String(anterior[campo] ?? '');
      const valorNuevo = String(nuevo[campo] ?? '');
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          equipo: { id: equipoId } as Equipo,
          campo,
          valorAnterior,
          valorNuevo,
          usuario: { id: usuarioId } as any,
        });
      }
    }

    if (cambios.length > 0) {
      await this.historialRepo.save(cambios);
    }
  }

  async findByEquipo(equipoId: number): Promise<HistorialCambio[]> {
    return this.historialRepo.find({
      where: { equipo: { id: equipoId } },
      relations: ['usuario'],
      order: { fecha: 'DESC' },
    });
  }
}
```

- [ ] **Step 5: Crear AuditoriaModule**

Crear `apps/backend/src/modules/auditoria/auditoria.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialCambio } from './entities/historial-cambio.entity';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialCambio])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
```

- [ ] **Step 6: Integrar AuditoriaService en EquiposService**

Editar `apps/backend/src/modules/equipos/equipos.service.ts` — modificar el método `update`:
```typescript
// Agregar al constructor:
constructor(
  @InjectRepository(Equipo) private readonly equipoRepo: Repository<Equipo>,
  private readonly auditoriaService: AuditoriaService,
) {}

// Modificar método update:
async update(id: number, dto: UpdateEquipoDto, usuarioId: number): Promise<Equipo> {
  const equipoAnterior = await this.findOne(id);
  const copiaAnterior = { ...equipoAnterior };
  Object.assign(equipoAnterior, dto);
  const equipoActualizado = await this.equipoRepo.save(equipoAnterior);
  await this.auditoriaService.registrarCambios(id, copiaAnterior as any, equipoActualizado, usuarioId);
  return equipoActualizado;
}
```

- [ ] **Step 7: Agregar endpoint GET historial en EquiposController**

Agregar en `apps/backend/src/modules/equipos/equipos.controller.ts`:
```typescript
@Get(':id/historial')
@Roles('ADMIN', 'GERENTE', 'TECNICO')
historial(@Param('id', ParseIntPipe) id: number) {
  return this.auditoriaService.findByEquipo(id);
}
```

- [ ] **Step 8: Ejecutar tests — deben pasar**

```bash
npx jest src/modules/auditoria/auditoria.service.spec.ts
```
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/auditoria/
git commit -m "feat(auditoria): registro automatico de cambios en equipos"
```

---

## FASE 5: Importación del Excel (Semana 3)

---

### Task 7: IntegracionesModule — Importación de Excel

**Files:**
- Create: `apps/backend/src/modules/integraciones/integraciones.service.ts`
- Create: `apps/backend/src/modules/integraciones/integraciones.controller.ts`
- Create: `apps/backend/src/modules/integraciones/integraciones.module.ts`
- Test: `apps/backend/src/modules/integraciones/integraciones.service.spec.ts`

**Interfaces:**
- Consumes: `EquiposService.create()` de Task 5
- Produces: `POST /api/integraciones/importar-excel` — acepta archivo `.xlsx` y carga equipos en BD

- [ ] **Step 1: Instalar dependencias para manejo de Excel y uploads**

```bash
cd apps/backend
npm install xlsx multer @nestjs/platform-express
npm install @types/multer --save-dev
```

- [ ] **Step 2: Escribir test — verificar que falla**

Crear `apps/backend/src/modules/integraciones/integraciones.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { IntegracionesService } from './integraciones.service';
import { EquiposService } from '../equipos/equipos.service';

describe('IntegracionesService', () => {
  let service: IntegracionesService;
  const mockEquiposService = { create: jest.fn().mockResolvedValue({ id: 1 }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracionesService,
        { provide: EquiposService, useValue: mockEquiposService },
      ],
    }).compile();
    service = module.get<IntegracionesService>(IntegracionesService);
  });

  it('debe parsear filas de Excel y retornar resumen', async () => {
    // Simular buffer de Excel con datos mínimos
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { EMPRESA: 'MT INDUSTRIAL', 'NOMBRE DISPOSITIVO': 'CORE1', TIPO: 'SWITCH', MARCA: 'Cisco', SERIE: 'ABC123' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = await service.importarExcel(buffer, 1);
    expect(result.importados).toBe(1);
    expect(result.errores).toBe(0);
  });
});
```

- [ ] **Step 3: Ejecutar test — debe fallar**

```bash
npx jest src/modules/integraciones/integraciones.service.spec.ts
```
Expected: FAIL

- [ ] **Step 4: Implementar IntegracionesService**

Crear `apps/backend/src/modules/integraciones/integraciones.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EquiposService } from '../equipos/equipos.service';

interface FilaExcel {
  EMPRESA?: string;
  'NOMBRE DISPOSITIVO'?: string;
  GERENCIA?: string;
  DEPARTAMENTO?: string;
  CODIGO?: string;
  CECO?: string;
  'UBICACIÓN'?: string;
  TIPO?: string;
  MARCA?: string;
  MODELO?: string;
  SERIE?: string;
  FIRMARE?: string;
  VERSION?: string;
  'END OF SALE'?: string;
  'END OF SUPPORT'?: string;
}

@Injectable()
export class IntegracionesService {
  private readonly logger = new Logger(IntegracionesService.name);

  constructor(private readonly equiposService: EquiposService) {}

  async importarExcel(buffer: Buffer, usuarioId: number): Promise<{ importados: number; errores: number; detalles: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas: FilaExcel[] = XLSX.utils.sheet_to_json(hoja);

    let importados = 0;
    let errores = 0;
    const detalles: string[] = [];

    for (const fila of filas) {
      try {
        await this.equiposService.create({
          empresa: fila.EMPRESA ?? 'MT INDUSTRIAL',
          nombre: fila['NOMBRE DISPOSITIVO'] ?? '',
          gerencia: fila.GERENCIA,
          departamento: fila.DEPARTAMENTO,
          codigo: fila.CODIGO,
          ceco: fila.CECO,
          ubicacion: fila['UBICACIÓN'],
          tipo: fila.TIPO,
          marca: fila.MARCA,
          modelo: fila.MODELO,
          serie: fila.SERIE,
          firmware: fila.FIRMARE,
          version: fila.VERSION,
          endOfSale: fila['END OF SALE'] ? new Date(fila['END OF SALE']).toISOString().split('T')[0] : undefined,
          endOfSupport: fila['END OF SUPPORT'] ? new Date(fila['END OF SUPPORT']).toISOString().split('T')[0] : undefined,
        }, usuarioId);
        importados++;
      } catch (error) {
        errores++;
        detalles.push(`Error en fila "${fila['NOMBRE DISPOSITIVO']}": ${error.message}`);
        this.logger.error(`Error importando fila: ${error.message}`);
      }
    }

    return { importados, errores, detalles };
  }
}
```

- [ ] **Step 5: Crear IntegracionesController**

Crear `apps/backend/src/modules/integraciones/integraciones.controller.ts`:
```typescript
import {
  Controller, Post, UseInterceptors, UploadedFile,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IntegracionesService } from './integraciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/integraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegracionesController {
  constructor(private readonly integracionesService: IntegracionesService) {}

  @Post('importar-excel')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importarExcel(@UploadedFile() archivo: Express.Multer.File, @Request() req: any) {
    if (!archivo) throw new BadRequestException('Archivo Excel requerido');
    return this.integracionesService.importarExcel(archivo.buffer, req.user.id);
  }
}
```

- [ ] **Step 6: Crear IntegracionesModule**

Crear `apps/backend/src/modules/integraciones/integraciones.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { IntegracionesService } from './integraciones.service';
import { IntegracionesController } from './integraciones.controller';
import { EquiposModule } from '../equipos/equipos.module';

@Module({
  imports: [EquiposModule],
  providers: [IntegracionesService],
  controllers: [IntegracionesController],
})
export class IntegracionesModule {}
```

- [ ] **Step 7: Ejecutar tests — deben pasar**

```bash
npx jest src/modules/integraciones/integraciones.service.spec.ts
```
Expected: PASS (1 test)

- [ ] **Step 8: Importar el Excel real**

```bash
curl -X POST http://localhost:3000/api/integraciones/importar-excel \
  -H "Authorization: Bearer <token>" \
  -F "archivo=@/ruta/al/Inventario_General_Equipos_Sole.xlsx"
```
Expected: `{"importados":284,"errores":0,"detalles":[]}`

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/modules/integraciones/
git commit -m "feat(integraciones): importacion de excel inicial con 284 equipos"
```

---

## FASE 6: Frontend React (Semana 3-4)

---

### Task 8: Frontend — Scaffold React + Vite + Auth

**Files:**
- Create: `apps/frontend/` (proyecto Vite + React + TypeScript)
- Create: `apps/frontend/src/store/authStore.ts`
- Create: `apps/frontend/src/services/api.ts`
- Create: `apps/frontend/src/pages/LoginPage.tsx`
- Create: `apps/frontend/src/App.tsx`

**Interfaces:**
- Produces: SPA en puerto 5173
- Produces: `useAuthStore()` — Zustand store con `{ token, user, login(), logout() }`
- Produces: `api` — instancia de axios con interceptor JWT

- [ ] **Step 1: Crear proyecto Vite + React**

```bash
cd apps/frontend
npm create vite@latest . -- --template react-ts
npm install
npm install zustand axios antd @ant-design/icons recharts
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom
```

- [ ] **Step 2: Crear servicio API con interceptor JWT**

Crear `apps/frontend/src/services/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 3: Crear Zustand auth store**

Crear `apps/frontend/src/store/authStore.ts`:
```typescript
import { create } from 'zustand';
import api from '../services/api';

interface Usuario {
  id: number;
  email: string;
  rol: string;
}

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token'),
  usuario: null,

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>('/api/auth/login', { email, password });
    localStorage.setItem('access_token', data.access_token);
    set({ token: data.access_token });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ token: null, usuario: null });
  },
}));
```

- [ ] **Step 4: Crear LoginPage**

Crear `apps/frontend/src/pages/LoginPage.tsx`:
```tsx
import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [cargando, setCargando] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    setCargando(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      message.error('Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="InventarioTI — MT INDUSTRIAL" style={{ width: 400 }}>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email inválido' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Contraseña requerida' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={cargando} block>
            Ingresar
          </Button>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Crear App.tsx con rutas**

Instalar react-router-dom:
```bash
npm install react-router-dom
```

Crear `apps/frontend/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import LoginPage from './pages/LoginPage';
import { useAuthStore } from './store/authStore';

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ConfigProvider locale={esES}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<RutaProtegida><div>Dashboard (próximamente)</div></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

- [ ] **Step 6: Verificar que el frontend arranca**

```bash
cd apps/frontend
npm run dev
```
Expected: `Local: http://localhost:5173/` — login funcional.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/
git commit -m "feat(frontend): scaffold react, auth store, login page"
```

---

### Task 9: Frontend — Dashboard y Gestión de Equipos

**Files:**
- Create: `apps/frontend/src/pages/DashboardPage.tsx`
- Create: `apps/frontend/src/pages/EquiposPage.tsx`
- Create: `apps/frontend/src/components/equipos/TablaEquipos.tsx`
- Create: `apps/frontend/src/components/equipos/FormEquipo.tsx`
- Create: `apps/frontend/src/services/equipos.service.ts`
- Create: `apps/frontend/src/store/equiposStore.ts`
- Create: `apps/frontend/src/layouts/MainLayout.tsx`

**Interfaces:**
- Consumes: `api` de Task 8, `useAuthStore` de Task 8
- Produces: tabla paginada de equipos con filtros, formulario de creación/edición

- [ ] **Step 1: Crear servicio de equipos**

Crear `apps/frontend/src/services/equipos.service.ts`:
```typescript
import api from './api';
import { Equipo, FiltrosEquipos, PaginatedResponse } from '../types/equipo.types';

export const equiposService = {
  async listar(filtros: FiltrosEquipos = {}): Promise<PaginatedResponse<Equipo>> {
    const { data } = await api.get('/api/equipos', { params: filtros });
    return data;
  },

  async obtener(id: number): Promise<Equipo> {
    const { data } = await api.get(`/api/equipos/${id}`);
    return data;
  },

  async crear(equipo: Partial<Equipo>): Promise<Equipo> {
    const { data } = await api.post('/api/equipos', equipo);
    return data;
  },

  async actualizar(id: number, equipo: Partial<Equipo>): Promise<Equipo> {
    const { data } = await api.put(`/api/equipos/${id}`, equipo);
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/api/equipos/${id}`);
  },
};
```

- [ ] **Step 2: Crear tipos**

Crear `apps/frontend/src/types/equipo.types.ts`:
```typescript
export interface Equipo {
  id: number;
  empresa: string;
  nombre: string;
  gerencia?: string;
  departamento?: string;
  codigo?: string;
  ceco?: string;
  ubicacion?: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  firmware?: string;
  version?: string;
  endOfSale?: string;
  endOfSupport?: string;
  estado: 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';
  creadoEn: string;
}

export interface FiltrosEquipos {
  tipo?: string;
  departamento?: string;
  ubicacion?: string;
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
```

- [ ] **Step 3: Crear TablaEquipos componente**

Crear `apps/frontend/src/components/equipos/TablaEquipos.tsx`:
```tsx
import { Table, Tag, Button, Space, Input, Select, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Equipo, FiltrosEquipos } from '../../types/equipo.types';
import { useState } from 'react';

interface Props {
  equipos: Equipo[];
  total: number;
  cargando: boolean;
  onFiltrar: (filtros: FiltrosEquipos) => void;
  onEditar: (equipo: Equipo) => void;
  onEliminar: (id: number) => void;
  rolUsuario: string;
}

const coloresEstado: Record<string, string> = {
  ACTIVO: 'green', BAJA: 'red', MANTENIMIENTO: 'orange',
};

export default function TablaEquipos({ equipos, total, cargando, onFiltrar, onEditar, onEliminar, rolUsuario }: Props) {
  const [page, setPage] = useState(1);

  const columnas = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo' },
    { title: 'Marca', dataIndex: 'marca', key: 'marca' },
    { title: 'Modelo', dataIndex: 'modelo', key: 'modelo', ellipsis: true },
    { title: 'Departamento', dataIndex: 'departamento', key: 'departamento' },
    { title: 'Ubicación', dataIndex: 'ubicacion', key: 'ubicacion' },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => <Tag color={coloresEstado[estado]}>{estado}</Tag>,
    },
    {
      title: 'Fin Soporte',
      dataIndex: 'endOfSupport',
      key: 'endOfSupport',
      render: (fecha: string) => fecha ? new Date(fecha).toLocaleDateString('es-PE') : '—',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: Equipo) => (
        <Space>
          {['ADMIN', 'GERENTE', 'TECNICO'].includes(rolUsuario) && (
            <Tooltip title="Editar">
              <Button icon={<EditOutlined />} size="small" onClick={() => onEditar(record)} />
            </Tooltip>
          )}
          {['ADMIN', 'GERENTE'].includes(rolUsuario) && (
            <Tooltip title="Dar de baja">
              <Button icon={<DeleteOutlined />} size="small" danger onClick={() => onEliminar(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Buscar por nombre..."
          prefix={<SearchOutlined />}
          onSearch={(v) => onFiltrar({ busqueda: v, page: 1 })}
          style={{ width: 250 }}
          allowClear
        />
        <Select placeholder="Tipo" allowClear style={{ width: 140 }}
          onChange={(v) => onFiltrar({ tipo: v, page: 1 })}
          options={['SWITCH','SERVIDOR','PC','LAPTOP','ROUTER','ACCESS POINT','OTRO'].map(t => ({ value: t, label: t }))}
        />
        <Select placeholder="Estado" allowClear style={{ width: 150 }}
          onChange={(v) => onFiltrar({ estado: v, page: 1 })}
          options={['ACTIVO','BAJA','MANTENIMIENTO'].map(e => ({ value: e, label: e }))}
        />
      </Space>
      <Table
        columns={columnas}
        dataSource={equipos}
        rowKey="id"
        loading={cargando}
        pagination={{
          total,
          pageSize: 50,
          current: page,
          onChange: (p) => { setPage(p); onFiltrar({ page: p }); },
          showTotal: (t) => `${t} equipos`,
        }}
        size="small"
        scroll={{ x: 900 }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Crear EquiposPage**

Crear `apps/frontend/src/pages/EquiposPage.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { Button, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import TablaEquipos from '../components/equipos/TablaEquipos';
import { equiposService } from '../services/equipos.service';
import { Equipo, FiltrosEquipos } from '../types/equipo.types';
import { useAuthStore } from '../store/authStore';

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosEquipos>({ page: 1, limit: 50 });
  const [equipoEditar, setEquipoEditar] = useState<Equipo | null>(null);
  const usuario = useAuthStore((s) => s.usuario);

  const cargarEquipos = useCallback(async (f: FiltrosEquipos) => {
    setCargando(true);
    try {
      const resultado = await equiposService.listar(f);
      setEquipos(resultado.data);
      setTotal(resultado.total);
    } catch {
      message.error('Error cargando equipos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarEquipos(filtros); }, [filtros, cargarEquipos]);

  const handleFiltrar = (nuevosFiltros: FiltrosEquipos) => {
    setFiltros((prev) => ({ ...prev, ...nuevosFiltros }));
  };

  const handleEliminar = async (id: number) => {
    Modal.confirm({
      title: '¿Dar de baja este equipo?',
      content: 'El equipo pasará a estado BAJA.',
      okText: 'Confirmar', cancelText: 'Cancelar', okType: 'danger',
      onOk: async () => {
        await equiposService.eliminar(id);
        message.success('Equipo dado de baja');
        cargarEquipos(filtros);
      },
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Inventario de Equipos ({total})</h2>
        {['ADMIN', 'GERENTE', 'TECNICO'].includes(usuario?.rol ?? '') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEquipoEditar({} as Equipo)}>
            Nuevo Equipo
          </Button>
        )}
      </div>
      <TablaEquipos
        equipos={equipos}
        total={total}
        cargando={cargando}
        onFiltrar={handleFiltrar}
        onEditar={setEquipoEditar}
        onEliminar={handleEliminar}
        rolUsuario={usuario?.rol ?? ''}
      />
    </div>
  );
}
```

- [ ] **Step 5: Crear MainLayout y actualizar App.tsx**

Crear `apps/frontend/src/layouts/MainLayout.tsx`:
```tsx
import { Layout, Menu } from 'antd';
import { DashboardOutlined, LaptopOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Sider, Content, Header } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ color: 'white', padding: 16, fontWeight: 'bold' }}>InventarioTI</div>
        <Menu
          theme="dark" mode="inline"
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { key: 'equipos', icon: <LaptopOutlined />, label: 'Equipos', onClick: () => navigate('/equipos') },
            { key: 'logout', icon: <LogoutOutlined />, label: 'Salir', onClick: () => { logout(); navigate('/login'); } },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <b>MT INDUSTRIAL S.A.C. — Gestión de Inventario TI</b>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

Actualizar `apps/frontend/src/App.tsx` para incluir EquiposPage y MainLayout en rutas.

- [ ] **Step 6: Verificar funcionamiento completo**

```bash
cd apps/frontend
npm run dev
```
1. Ir a `http://localhost:5173/login`
2. Iniciar sesión con admin
3. Verificar que la tabla de equipos carga con los 284 equipos importados

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/
git commit -m "feat(frontend): dashboard, tabla equipos con filtros y paginacion"
```

---

## FASE 7: Alertas Automáticas (Semana 4-5)

---

### Task 10: AlertasModule — Cron Job y Notificaciones

**Files:**
- Create: `apps/backend/src/modules/alertas/entities/alerta.entity.ts`
- Create: `apps/backend/src/modules/alertas/alertas.service.ts`
- Create: `apps/backend/src/modules/alertas/alertas.controller.ts`
- Create: `apps/backend/src/modules/alertas/alertas.module.ts`
- Test: `apps/backend/src/modules/alertas/alertas.service.spec.ts`

**Interfaces:**
- Consumes: `Equipo` entity
- Produces: cron job que corre a las 2:00 AM y crea alertas en `INV_ZYL.alertas`
- Produces: `GET /api/alertas`, `PUT /api/alertas/:id/leer`

- [ ] **Step 1: Instalar @nestjs/schedule**

```bash
cd apps/backend
npm install @nestjs/schedule
```

- [ ] **Step 2: Crear entidad Alerta**

Crear `apps/backend/src/modules/alertas/entities/alerta.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Equipo } from '../../equipos/entities/equipo.entity';

export type TipoAlerta = 'END_OF_SALE' | 'END_OF_SUPPORT';

@Entity({ name: 'alertas', schema: 'INV_ZYL' })
export class Alerta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @Column({ length: 30 })
  tipo: TipoAlerta;

  @Column({ name: 'dias_restantes', nullable: true })
  diasRestantes: number;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
```

- [ ] **Step 3: Escribir tests — verificar que fallan**

Crear `apps/backend/src/modules/alertas/alertas.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AlertasService } from './alertas.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alerta } from './entities/alerta.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

describe('AlertasService', () => {
  let service: AlertasService;

  const mockAlertaRepo = { findOne: jest.fn(), save: jest.fn(), find: jest.fn() };
  const mockEquipoRepo = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertasService,
        { provide: getRepositoryToken(Alerta), useValue: mockAlertaRepo },
        { provide: getRepositoryToken(Equipo), useValue: mockEquipoRepo },
      ],
    }).compile();
    service = module.get<AlertasService>(AlertasService);
  });

  it('debe crear alertas para equipos con end_of_support en 30 dias', async () => {
    const fechaProxima = new Date();
    fechaProxima.setDate(fechaProxima.getDate() + 15);

    mockEquipoRepo.find.mockResolvedValue([
      { id: 1, nombre: 'CORE1', endOfSupport: fechaProxima, estado: 'ACTIVO' },
    ]);
    mockAlertaRepo.findOne.mockResolvedValue(null); // no existe alerta previa
    mockAlertaRepo.save.mockResolvedValue({});

    await service.verificarFinCicloVida();
    expect(mockAlertaRepo.save).toHaveBeenCalled();
  });

  it('no debe crear alerta duplicada si ya existe', async () => {
    mockEquipoRepo.find.mockResolvedValue([{ id: 1, nombre: 'CORE1', endOfSupport: new Date(), estado: 'ACTIVO' }]);
    mockAlertaRepo.findOne.mockResolvedValue({ id: 1 }); // ya existe
    mockAlertaRepo.save.mockClear();

    await service.verificarFinCicloVida();
    expect(mockAlertaRepo.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Ejecutar tests — deben fallar**

```bash
npx jest src/modules/alertas/alertas.service.spec.ts
```
Expected: FAIL

- [ ] **Step 5: Implementar AlertasService**

Crear `apps/backend/src/modules/alertas/alertas.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alerta, TipoAlerta } from './entities/alerta.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

const DIAS_ANTICIPACION = 30;

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(Alerta) private readonly alertaRepo: Repository<Alerta>,
    @InjectRepository(Equipo) private readonly equipoRepo: Repository<Equipo>,
  ) {}

  @Cron('0 2 * * *') // 2:00 AM diario
  async verificarFinCicloVida(): Promise<void> {
    this.logger.log('Iniciando verificación de fin de ciclo de vida...');
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_ANTICIPACION);

    const equipos = await this.equipoRepo.find({
      where: [
        { endOfSupport: LessThanOrEqual(fechaLimite), estado: 'ACTIVO' },
        { endOfSale: LessThanOrEqual(fechaLimite), estado: 'ACTIVO' },
      ],
    });

    for (const equipo of equipos) {
      if (equipo.endOfSupport && new Date(equipo.endOfSupport) <= fechaLimite) {
        await this.crearAlertaSiNoExiste(equipo, 'END_OF_SUPPORT');
      }
      if (equipo.endOfSale && new Date(equipo.endOfSale) <= fechaLimite) {
        await this.crearAlertaSiNoExiste(equipo, 'END_OF_SALE');
      }
    }

    this.logger.log(`Verificación completa. Equipos revisados: ${equipos.length}`);
  }

  private async crearAlertaSiNoExiste(equipo: Equipo, tipo: TipoAlerta): Promise<void> {
    const existe = await this.alertaRepo.findOne({
      where: { equipo: { id: equipo.id }, tipo, leida: false },
    });
    if (existe) return;

    const fecha = tipo === 'END_OF_SUPPORT' ? equipo.endOfSupport : equipo.endOfSale;
    const diasRestantes = Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    await this.alertaRepo.save({ equipo, tipo, diasRestantes });
  }

  async findActivas(): Promise<Alerta[]> {
    return this.alertaRepo.find({
      where: { leida: false },
      relations: ['equipo'],
      order: { creadoEn: 'DESC' },
    });
  }

  async marcarLeida(id: number): Promise<void> {
    await this.alertaRepo.save({ id, leida: true });
  }
}
```

- [ ] **Step 6: Crear AlertasController y AlertasModule**

Crear `apps/backend/src/modules/alertas/alertas.controller.ts`:
```typescript
import { Controller, Get, Put, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/alertas')
@UseGuards(JwtAuthGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  findActivas() { return this.alertasService.findActivas(); }

  @Put(':id/leer')
  marcarLeida(@Param('id', ParseIntPipe) id: number) {
    return this.alertasService.marcarLeida(id);
  }
}
```

Crear `apps/backend/src/modules/alertas/alertas.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Alerta } from './entities/alerta.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { AlertasService } from './alertas.service';
import { AlertasController } from './alertas.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Alerta, Equipo]),
  ],
  providers: [AlertasService],
  controllers: [AlertasController],
})
export class AlertasModule {}
```

- [ ] **Step 7: Ejecutar tests — deben pasar**

```bash
npx jest src/modules/alertas/alertas.service.spec.ts
```
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/alertas/
git commit -m "feat(alertas): cron job diario de fin de ciclo de vida"
```

---

## FASE 8: Reportes y Exportación (Semana 5)

---

### Task 11: ReportesModule — Dashboard + Exportación PDF/CSV

**Files:**
- Create: `apps/backend/src/modules/reportes/reportes.service.ts`
- Create: `apps/backend/src/modules/reportes/reportes.controller.ts`
- Create: `apps/backend/src/modules/reportes/reportes.module.ts`
- Test: `apps/backend/src/modules/reportes/reportes.service.spec.ts`

**Interfaces:**
- Consumes: `Equipo` entity, `Alerta` entity
- Produces: `GET /api/reportes/dashboard` — métricas totales, por tipo, por estado
- Produces: `GET /api/reportes/fin-ciclo-vida` — equipos próximos a vencer
- Produces: `GET /api/reportes/exportar?format=csv` — descarga CSV
- Produces: `GET /api/reportes/exportar?format=pdf` — descarga PDF

- [ ] **Step 1: Instalar dependencias**

```bash
cd apps/backend
npm install pdfkit csv-stringify
npm install @types/pdfkit --save-dev
```

- [ ] **Step 2: Escribir tests — verificar que fallan**

Crear `apps/backend/src/modules/reportes/reportes.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';

describe('ReportesService', () => {
  let service: ReportesService;
  const mockEquipoRepo = {
    count: jest.fn().mockResolvedValue(284),
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ tipo: 'SWITCH', total: '10' }]),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: getRepositoryToken(Equipo), useValue: mockEquipoRepo },
      ],
    }).compile();
    service = module.get<ReportesService>(ReportesService);
  });

  it('getDashboard debe retornar total de equipos', async () => {
    const result = await service.getDashboard();
    expect(result.totalEquipos).toBe(284);
    expect(result.porTipo).toBeDefined();
  });
});
```

- [ ] **Step 3: Ejecutar tests — deben fallar**

```bash
npx jest src/modules/reportes/reportes.service.spec.ts
```
Expected: FAIL

- [ ] **Step 4: Implementar ReportesService**

Crear `apps/backend/src/modules/reportes/reportes.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import * as PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Equipo)
    private readonly equipoRepo: Repository<Equipo>,
  ) {}

  async getDashboard() {
    const totalEquipos = await this.equipoRepo.count();

    const porTipo = await this.equipoRepo
      .createQueryBuilder('e')
      .select('e.tipo', 'tipo')
      .addSelect('COUNT(*)', 'total')
      .groupBy('e.tipo')
      .getRawMany();

    const porEstado = await this.equipoRepo
      .createQueryBuilder('e')
      .select('e.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('e.estado')
      .getRawMany();

    const porDepartamento = await this.equipoRepo
      .createQueryBuilder('e')
      .select('e.departamento', 'departamento')
      .addSelect('COUNT(*)', 'total')
      .groupBy('e.departamento')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany();

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 90);
    const proximosVencer = await this.equipoRepo.count({
      where: { endOfSupport: LessThanOrEqual(fechaLimite), estado: 'ACTIVO' },
    });

    return { totalEquipos, porTipo, porEstado, porDepartamento, proximosVencer };
  }

  async getFinCicloVida(dias = 90): Promise<Equipo[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);
    return this.equipoRepo.find({
      where: { endOfSupport: LessThanOrEqual(fechaLimite), estado: 'ACTIVO' },
      order: { endOfSupport: 'ASC' },
    });
  }

  async exportarCsv(): Promise<Buffer> {
    const equipos = await this.equipoRepo.find({ order: { nombre: 'ASC' } });
    const filas = equipos.map((e) => [
      e.empresa, e.nombre, e.tipo, e.marca, e.modelo, e.serie,
      e.departamento, e.ubicacion, e.estado,
      e.endOfSale ? new Date(e.endOfSale).toLocaleDateString('es-PE') : '',
      e.endOfSupport ? new Date(e.endOfSupport).toLocaleDateString('es-PE') : '',
    ]);
    const csv = stringify([
      ['Empresa','Nombre','Tipo','Marca','Modelo','Serie','Departamento','Ubicacion','Estado','Fin Venta','Fin Soporte'],
      ...filas,
    ]);
    return Buffer.from(csv, 'utf-8');
  }

  async exportarPdf(): Promise<Buffer> {
    const equipos = await this.equipoRepo.find({ order: { nombre: 'ASC' } });
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(16).text('Inventario de Equipos TI — MT INDUSTRIAL S.A.C.', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Total: ${equipos.length} equipos | Generado: ${new Date().toLocaleDateString('es-PE')}`);
      doc.moveDown();

      equipos.forEach((e, i) => {
        if (i % 40 === 0 && i > 0) doc.addPage();
        doc.fontSize(8).text(
          `${e.nombre} | ${e.tipo ?? ''} | ${e.marca ?? ''} | ${e.modelo ?? ''} | ${e.departamento ?? ''} | ${e.estado}`,
          { continued: false }
        );
      });

      doc.end();
    });
  }
}
```

- [ ] **Step 5: Crear ReportesController**

Crear `apps/backend/src/modules/reportes/reportes.controller.ts`:
```typescript
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  getDashboard() { return this.reportesService.getDashboard(); }

  @Get('fin-ciclo-vida')
  getFinCicloVida(@Query('dias') dias: string) {
    return this.reportesService.getFinCicloVida(dias ? parseInt(dias) : 90);
  }

  @Get('exportar')
  @Roles('ADMIN', 'GERENTE', 'TECNICO')
  async exportar(@Query('format') format: string, @Res() res: Response) {
    if (format === 'csv') {
      const buffer = await this.reportesService.exportarCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=inventario-ti.csv');
      res.send(buffer);
    } else {
      const buffer = await this.reportesService.exportarPdf();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=inventario-ti.pdf');
      res.send(buffer);
    }
  }
}
```

- [ ] **Step 6: Crear ReportesModule y registrar**

Crear `apps/backend/src/modules/reportes/reportes.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipo } from '../equipos/entities/equipo.entity';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Equipo])],
  providers: [ReportesService],
  controllers: [ReportesController],
})
export class ReportesModule {}
```

- [ ] **Step 7: Ejecutar tests — deben pasar**

```bash
npx jest src/modules/reportes/reportes.service.spec.ts
```
Expected: PASS (1 test)

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/reportes/
git commit -m "feat(reportes): dashboard metricas, fin ciclo vida, exportar pdf y csv"
```

---

## FASE 9: Docker + CI/CD (Semana 5-6)

---

### Task 12: Docker — Containerización

**Files:**
- Create: `apps/backend/Dockerfile`
- Create: `apps/frontend/Dockerfile`
- Create: `docker/docker-compose.yml`
- Create: `docker/docker-compose.prod.yml`

**Interfaces:**
- Produces: `docker compose up` levanta frontend, backend, Redis, RabbitMQ
- Produces: imágenes Docker para producción

- [ ] **Step 1: Crear Dockerfile del backend**

Crear `apps/backend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Crear Dockerfile del frontend**

Crear `apps/frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Crear `apps/frontend/nginx.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api {
    proxy_pass http://backend:3000;
  }
}
```

- [ ] **Step 3: Crear docker-compose.yml**

Crear `docker/docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ../apps/backend
    ports: ["3000:3000"]
    env_file: ../.env
    depends_on: [redis, rabbitmq]

  frontend:
    build: ../apps/frontend
    ports: ["80:80"]
    depends_on: [backend]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports: ["5672:5672", "15672:15672"]
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

- [ ] **Step 4: Verificar que los contenedores levantan**

```bash
cd docker
docker compose up --build
```
Expected: todos los servicios corren sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/Dockerfile apps/frontend/Dockerfile apps/frontend/nginx.conf docker/
git commit -m "chore(docker): containerizacion backend, frontend, redis, rabbitmq"
```

---

### Task 13: GitHub Actions — CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: CI que corre en cada push: lint + unit tests + build
- Produces: deploy automático a staging en merge a main

- [ ] **Step 1: Crear CI workflow**

Crear `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/backend/package-lock.json
      - name: Instalar dependencias
        run: cd apps/backend && npm ci
      - name: Lint
        run: cd apps/backend && npm run lint
      - name: Tests unitarios
        run: cd apps/backend && npm run test -- --coverage --passWithNoTests
        env:
          DB_HOST: localhost
          DB_SCHEMA: INV_ZYL
          JWT_SECRET: test_secret_ci

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: apps/frontend/package-lock.json
      - name: Instalar dependencias
        run: cd apps/frontend && npm ci
      - name: Lint
        run: cd apps/frontend && npm run lint
      - name: Build
        run: cd apps/frontend && npm run build
```

- [ ] **Step 2: Verificar que el workflow pasa en GitHub**

```bash
git add .github/
git commit -m "chore(ci): github actions lint y tests en cada push"
git push origin main
```
Ir a `https://github.com/onunez2025/InvetarioTI/actions` y verificar que el CI pasa (verde).

---

## Resumen de Tareas

| # | Tarea | Fase | Estado |
|---|-------|------|--------|
| 1 | Monorepo + estructura base | Setup | ⬜ |
| 2 | Backend NestJS + SQL Azure | Setup | ⬜ |
| 3 | Migraciones schema INV_ZYL | BD | ⬜ |
| 4 | AuthModule + JWT | Auth | ⬜ |
| 5 | EquiposModule CRUD | Equipos | ⬜ |
| 6 | Auditoría de cambios | Equipos | ⬜ |
| 7 | Importación Excel | Integraciones | ⬜ |
| 8 | Frontend scaffold + Auth | Frontend | ⬜ |
| 9 | Frontend Dashboard + Equipos | Frontend | ⬜ |
| 10 | AlertasModule cron job | Alertas | ⬜ |
| 11 | ReportesModule + exportación | Reportes | ⬜ |
| 12 | Docker containerización | DevOps | ⬜ |
| 13 | GitHub Actions CI/CD | DevOps | ⬜ |

---

*Plan generado: 2026-08-21 — MT INDUSTRIAL S.A.C.*
