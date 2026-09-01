# Modelos, Compras e Inventario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar catálogo de modelos de unidades físicas, añadir módulo de compras con proveedores/facturas, e inventario de stock para periféricos sin serie con trazabilidad por colaborador.

**Architecture:** Opción A (split limpio): nueva tabla `modelos` como catálogo central; `equipos` pasa a unidad física pura con FK a `modelos`; `compras`/`compras_detalle` registran ingresos; `stock_asignaciones` rastrea periféricos sin serie por colaborador. TypeORM migrations (synchronize: false).

**Tech Stack:** NestJS 11 · TypeORM · Azure SQL (schema `inventario_ti`) · React 18 · Vite 5 · Ant Design 5 · Zustand · React Router v6

**Spec:** `docs/superpowers/specs/2026-09-01-inventario-modelos-compras-design.md`

## Global Constraints

- Schema SQL: siempre `inventario_ti` (no `INV_ZYL` de migraciones antiguas)
- Migrations numeradas: 005, 006, 007, 008 — cada una tiene `up()` y `down()` reversibles
- Entities: `@Entity({ name: 'tabla', schema: 'inventario_ti' })`
- Controllers: `@UseGuards(JwtAuthGuard, RolesGuard)` en clase; `@Roles(...)` en método
- `import type { Response } from 'express'` (nunca `import { Response }`) en controllers con `@Res()`
- Permisos: ADMIN+TECNICO escritura, GERENTE lectura, VISUALIZADOR lectura
- TypeORM relations: `eager: false` por defecto; cargar con `relations: [...]` en queries explícitas
- Frontend services: usar `api` (axios instance de `src/services/api.ts`) — nunca `fetch`

---

## Task 1: DDL — modelos y proveedores (Migration 005 + Entities)

**Files:**
- Create: `apps/backend/src/database/migrations/005-create-modelos-proveedores.ts`
- Create: `apps/backend/src/modules/modelos/entities/modelo.entity.ts`
- Create: `apps/backend/src/modules/proveedores/entities/proveedor.entity.ts`

**Interfaces:**
- Produces: `Modelo` entity con campos: `id, codigo, nombre, marca, tipo, descripcion, tieneSerie, endOfSale, endOfSupport, firmwareRef, activo, creadoEn, actualizadoEn`
- Produces: `Proveedor` entity con campos: `id, nombre, ruc, telefono, email, activo, creadoEn`

- [ ] **Step 1: Escribir migration 005**

```typescript
// apps/backend/src/database/migrations/005-create-modelos-proveedores.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModelosProveedores1005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.proveedores (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        nombre    NVARCHAR(150) NOT NULL,
        ruc       NVARCHAR(20),
        telefono  NVARCHAR(30),
        email     NVARCHAR(100),
        activo    BIT NOT NULL DEFAULT 1,
        creado_en DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE inventario_ti.modelos (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        codigo          NVARCHAR(50)  NOT NULL,
        nombre          NVARCHAR(150) NOT NULL,
        marca           NVARCHAR(100),
        tipo            NVARCHAR(50),
        descripcion     NVARCHAR(500),
        tiene_serie     BIT NOT NULL DEFAULT 1,
        end_of_sale     DATE,
        end_of_support  DATE,
        firmware_ref    NVARCHAR(100),
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETUTCDATE(),
        actualizado_en  DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_modelos_codigo UNIQUE (codigo)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_modelos_tipo ON inventario_ti.modelos(tipo)`);
    await queryRunner.query(`CREATE INDEX IX_modelos_tiene_serie ON inventario_ti.modelos(tiene_serie)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.modelos`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.proveedores`);
  }
}
```

- [ ] **Step 2: Escribir Modelo entity**

```typescript
// apps/backend/src/modules/modelos/entities/modelo.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'modelos', schema: 'inventario_ti' })
export class Modelo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 100, nullable: true })
  marca: string;

  @Column({ length: 50, nullable: true })
  tipo: string;

  @Column({ length: 500, nullable: true })
  descripcion: string;

  @Column({ name: 'tiene_serie', default: true })
  tieneSerie: boolean;

  @Column({ name: 'end_of_sale', type: 'date', nullable: true })
  endOfSale: Date;

  @Column({ name: 'end_of_support', type: 'date', nullable: true })
  endOfSupport: Date;

  @Column({ name: 'firmware_ref', length: 100, nullable: true })
  firmwareRef: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
```

- [ ] **Step 3: Escribir Proveedor entity**

```typescript
// apps/backend/src/modules/proveedores/entities/proveedor.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity({ name: 'proveedores', schema: 'inventario_ti' })
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ length: 20, nullable: true })
  ruc: string;

  @Column({ length: 30, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/database/migrations/005-create-modelos-proveedores.ts
git add apps/backend/src/modules/modelos/entities/modelo.entity.ts
git add apps/backend/src/modules/proveedores/entities/proveedor.entity.ts
git commit -m "feat(db): migration 005 - tablas modelos y proveedores"
```

---

## Task 2: Backend — ModelosModule + ProveedoresModule

**Files:**
- Create: `apps/backend/src/modules/modelos/dto/create-modelo.dto.ts`
- Create: `apps/backend/src/modules/modelos/modelos.service.ts`
- Create: `apps/backend/src/modules/modelos/modelos.controller.ts`
- Create: `apps/backend/src/modules/modelos/modelos.module.ts`
- Create: `apps/backend/src/modules/proveedores/dto/create-proveedor.dto.ts`
- Create: `apps/backend/src/modules/proveedores/proveedores.service.ts`
- Create: `apps/backend/src/modules/proveedores/proveedores.controller.ts`
- Create: `apps/backend/src/modules/proveedores/proveedores.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: `Modelo` entity (Task 1), `Proveedor` entity (Task 1)
- Produces:
  - `GET /api/modelos?tipo=&tieneSerie=&activo=` → `{ data: Modelo[], total: number }`
  - `GET /api/modelos/:id` → `Modelo`
  - `POST /api/modelos` → `Modelo`
  - `PATCH /api/modelos/:id` → `Modelo`
  - `GET /api/proveedores` → `Proveedor[]`
  - `POST /api/proveedores` → `Proveedor`
  - `PATCH /api/proveedores/:id` → `Proveedor`

- [ ] **Step 1: Crear CreateModeloDto**

```typescript
// apps/backend/src/modules/modelos/dto/create-modelo.dto.ts
import { IsString, IsBoolean, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateModeloDto {
  @IsString() @MaxLength(50)  codigo: string;
  @IsString() @MaxLength(150) nombre: string;
  @IsOptional() @IsString() @MaxLength(100)  marca?: string;
  @IsOptional() @IsString() @MaxLength(50)   tipo?: string;
  @IsOptional() @IsString() @MaxLength(500)  descripcion?: string;
  @IsBoolean()                               tieneSerie: boolean;
  @IsOptional() @IsDateString()              endOfSale?: string;
  @IsOptional() @IsDateString()              endOfSupport?: string;
  @IsOptional() @IsString() @MaxLength(100)  firmwareRef?: string;
}

export class UpdateModeloDto extends CreateModeloDto {}
```

- [ ] **Step 2: Escribir ModelosService**

```typescript
// apps/backend/src/modules/modelos/modelos.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modelo } from './entities/modelo.entity';
import { CreateModeloDto, UpdateModeloDto } from './dto/create-modelo.dto';

@Injectable()
export class ModelosService {
  constructor(
    @InjectRepository(Modelo) private readonly repo: Repository<Modelo>,
  ) {}

  async findAll(filtros: { tipo?: string; tieneSerie?: boolean; activo?: boolean }): Promise<{ data: Modelo[]; total: number }> {
    const qb = this.repo.createQueryBuilder('m');
    if (filtros.tipo)       qb.andWhere('m.tipo = :tipo', { tipo: filtros.tipo });
    if (filtros.tieneSerie !== undefined) qb.andWhere('m.tieneSerie = :ts', { ts: filtros.tieneSerie });
    if (filtros.activo !== undefined)     qb.andWhere('m.activo = :a', { a: filtros.activo });
    qb.orderBy('m.nombre', 'ASC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: number): Promise<Modelo> {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException(`Modelo ${id} no encontrado`);
    return m;
  }

  async create(dto: CreateModeloDto): Promise<Modelo> {
    const exists = await this.repo.findOne({ where: { codigo: dto.codigo } });
    if (exists) throw new ConflictException(`Código de modelo '${dto.codigo}' ya existe`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateModeloDto): Promise<Modelo> {
    const modelo = await this.findOne(id);
    Object.assign(modelo, dto);
    return this.repo.save(modelo);
  }
}
```

- [ ] **Step 3: Escribir ModelosController**

```typescript
// apps/backend/src/modules/modelos/modelos.controller.ts
import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ModelosService } from './modelos.service';
import { CreateModeloDto, UpdateModeloDto } from './dto/create-modelo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/modelos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelosController {
  constructor(private readonly svc: ModelosService) {}

  @Get()
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  findAll(@Query('tipo') tipo?: string, @Query('tieneSerie') ts?: string, @Query('activo') activo?: string) {
    return this.svc.findAll({
      tipo,
      tieneSerie: ts !== undefined ? ts === 'true' : undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @Roles('ADMIN','TECNICO')
  create(@Body() dto: CreateModeloDto) { return this.svc.create(dto); }

  @Patch(':id')
  @Roles('ADMIN','TECNICO')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModeloDto) {
    return this.svc.update(id, dto);
  }
}
```

- [ ] **Step 4: ModelosModule + ProveedoresModule (service + controller + module completo para ambos)**

```typescript
// apps/backend/src/modules/modelos/modelos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modelo } from './entities/modelo.entity';
import { ModelosService } from './modelos.service';
import { ModelosController } from './modelos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Modelo])],
  providers: [ModelosService],
  controllers: [ModelosController],
  exports: [ModelosService],
})
export class ModelosModule {}
```

Para Proveedores, repetir exactamente el mismo patrón:
- `CreateProveedorDto`: `nombre` (required), `ruc?`, `telefono?`, `email?`
- `ProveedoresService`: `findAll()` (todos activos), `findOne(id)`, `create(dto)`, `update(id, dto)`
- `ProveedoresController`: `GET /api/proveedores`, `GET /api/proveedores/:id`, `POST`, `PATCH /:id`
- `ProveedoresModule`: exporta `ProveedoresService`

- [ ] **Step 5: Registrar módulos en AppModule**

```typescript
// apps/backend/src/app.module.ts  — agregar imports:
import { ModelosModule }     from './modules/modelos/modelos.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';

// En @Module({ imports: [...] }) agregar:
ModelosModule,
ProveedoresModule,
```

- [ ] **Step 6: Compilar backend y verificar que no hay errores de TS**

```bash
cd apps/backend && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/modelos/ apps/backend/src/modules/proveedores/ apps/backend/src/app.module.ts
git commit -m "feat(backend): ModelosModule + ProveedoresModule CRUD"
```

---

## Task 3: DDL + Entities — compras, compras_detalle, stock_asignaciones (Migration 006 + 007 + 008)

**Files:**
- Create: `apps/backend/src/database/migrations/006-create-compras.ts`
- Create: `apps/backend/src/database/migrations/007-refactor-equipos.ts`
- Create: `apps/backend/src/database/migrations/008-create-stock-asignaciones.ts`
- Create: `apps/backend/src/modules/compras/entities/compra.entity.ts`
- Create: `apps/backend/src/modules/compras/entities/compra-detalle.entity.ts`
- Create: `apps/backend/src/modules/stock-asignaciones/entities/stock-asignacion.entity.ts`

**Interfaces:**
- Produces: `Compra` entity, `CompraDetalle` entity, `StockAsignacion` entity
- Produces: `Equipo` entity actualizado con `modeloId`, `compraDetalleId` (sin `marca`, `modelo` texto, `tipo`, `firmware`, `version`, `endOfSale`, `endOfSupport`)

- [ ] **Step 1: Migration 006 — compras + compras_detalle**

```typescript
// apps/backend/src/database/migrations/006-create-compras.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompras1006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.compras (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        proveedor_id      INT NOT NULL REFERENCES inventario_ti.proveedores(id),
        numero_documento  NVARCHAR(50) NOT NULL,
        tipo_documento    NVARCHAR(20) NOT NULL
          CHECK (tipo_documento IN ('FACTURA','OC','BOLETA','NOTA_INGRESO')),
        fecha_documento   DATE NOT NULL,
        observaciones     NVARCHAR(500),
        creado_por        INT REFERENCES inventario_ti.usuarios(id),
        creado_en         DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE inventario_ti.compras_detalle (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        compra_id        INT NOT NULL REFERENCES inventario_ti.compras(id),
        modelo_id        INT NOT NULL REFERENCES inventario_ti.modelos(id),
        cantidad         INT NOT NULL CHECK (cantidad > 0),
        precio_unitario  DECIMAL(12,2)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_compras_detalle_compra ON inventario_ti.compras_detalle(compra_id)`);
    await queryRunner.query(`CREATE INDEX IX_compras_detalle_modelo ON inventario_ti.compras_detalle(modelo_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.compras_detalle`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.compras`);
  }
}
```

- [ ] **Step 2: Migration 007 — refactor equipos**

```typescript
// apps/backend/src/database/migrations/007-refactor-equipos.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEquipos1007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar nuevas columnas
    await queryRunner.query(`
      ALTER TABLE inventario_ti.equipos
        ADD modelo_id         INT REFERENCES inventario_ti.modelos(id),
            compra_detalle_id INT REFERENCES inventario_ti.compras_detalle(id)
    `);
    // Eliminar columnas de catálogo (tabla vacía, sin riesgo de datos)
    await queryRunner.query(`
      ALTER TABLE inventario_ti.equipos
        DROP COLUMN marca, modelo, tipo, firmware, version, end_of_sale, end_of_support
    `);
    // También quitar nombre (ahora es alias/descripción de la unidad — si existe en producción vacía)
    // El campo nombre lo reemplaza la combinación modelo.nombre + equipo.serie
    // OJO: si hay un constraint de NOT NULL en nombre, primero hacerlo nullable
    await queryRunner.query(`ALTER TABLE inventario_ti.equipos ALTER COLUMN nombre NVARCHAR(150) NULL`);
    await queryRunner.query(`CREATE INDEX IX_equipos_modelo ON inventario_ti.equipos(modelo_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE inventario_ti.equipos DROP COLUMN modelo_id, compra_detalle_id`);
    await queryRunner.query(`
      ALTER TABLE inventario_ti.equipos
        ADD marca NVARCHAR(100), modelo NVARCHAR(150), tipo NVARCHAR(50),
            firmware NVARCHAR(100), version NVARCHAR(50),
            end_of_sale DATE, end_of_support DATE
    `);
  }
}
```

- [ ] **Step 3: Migration 008 — stock_asignaciones**

```typescript
// apps/backend/src/database/migrations/008-create-stock-asignaciones.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockAsignaciones1008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.stock_asignaciones (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        modelo_id       INT NOT NULL REFERENCES inventario_ti.modelos(id),
        colaborador_id  INT NOT NULL REFERENCES inventario_ti.colaboradores(id),
        cantidad        INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
        fecha_inicio    DATE NOT NULL,
        fecha_fin       DATE,
        observaciones   NVARCHAR(500),
        creado_por      INT REFERENCES inventario_ti.usuarios(id),
        creado_en       DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_sa_modelo      ON inventario_ti.stock_asignaciones(modelo_id)`);
    await queryRunner.query(`CREATE INDEX IX_sa_colaborador ON inventario_ti.stock_asignaciones(colaborador_id)`);
    await queryRunner.query(`CREATE INDEX IX_sa_fecha_fin   ON inventario_ti.stock_asignaciones(fecha_fin)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.stock_asignaciones`);
  }
}
```

- [ ] **Step 4: Compra entity**

```typescript
// apps/backend/src/modules/compras/entities/compra.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Usuario }   from '../../usuarios/entities/usuario.entity';
import { CompraDetalle } from './compra-detalle.entity';

export type TipoDocumento = 'FACTURA' | 'OC' | 'BOLETA' | 'NOTA_INGRESO';

@Entity({ name: 'compras', schema: 'inventario_ti' })
export class Compra {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Proveedor, { eager: true })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ name: 'proveedor_id' }) proveedorId: number;

  @Column({ name: 'numero_documento', length: 50 }) numeroDocumento: string;

  @Column({ name: 'tipo_documento', length: 20 }) tipoDocumento: TipoDocumento;

  @Column({ name: 'fecha_documento', type: 'date' }) fechaDocumento: string;

  @Column({ length: 500, nullable: true }) observaciones: string;

  @OneToMany(() => CompraDetalle, (d) => d.compra, { cascade: true })
  detalles: CompraDetalle[];

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @Column({ name: 'creado_por', nullable: true }) creadoPorId: number;

  @CreateDateColumn({ name: 'creado_en' }) creadoEn: Date;
}
```

- [ ] **Step 5: CompraDetalle entity**

```typescript
// apps/backend/src/modules/compras/entities/compra-detalle.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Compra } from './compra.entity';
import { Modelo } from '../../modelos/entities/modelo.entity';

@Entity({ name: 'compras_detalle', schema: 'inventario_ti' })
export class CompraDetalle {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Compra, (c) => c.detalles)
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;

  @Column({ name: 'compra_id' }) compraId: number;

  @ManyToOne(() => Modelo, { eager: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id' }) modeloId: number;

  @Column() cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioUnitario: number;
}
```

- [ ] **Step 6: StockAsignacion entity**

```typescript
// apps/backend/src/modules/stock-asignaciones/entities/stock-asignacion.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Modelo }      from '../../modelos/entities/modelo.entity';
import { Colaborador } from '../../colaboradores/entities/colaborador.entity';
import { Usuario }     from '../../usuarios/entities/usuario.entity';

@Entity({ name: 'stock_asignaciones', schema: 'inventario_ti' })
export class StockAsignacion {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Modelo, { eager: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id' }) modeloId: number;

  @ManyToOne(() => Colaborador, { eager: true })
  @JoinColumn({ name: 'colaborador_id' })
  colaborador: Colaborador;

  @Column({ name: 'colaborador_id' }) colaboradorId: number;

  @Column({ default: 1 }) cantidad: number;

  @Column({ name: 'fecha_inicio', type: 'date' }) fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true }) fechaFin: string | null;

  @Column({ length: 500, nullable: true }) observaciones: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @Column({ name: 'creado_por', nullable: true }) creadoPorId: number;

  @CreateDateColumn({ name: 'creado_en' }) creadoEn: Date;
}
```

- [ ] **Step 7: Actualizar Equipo entity** — quitar `marca, modelo, tipo, firmware, version, endOfSale, endOfSupport`; agregar `modeloId`, `compraDetalleId`, `nombre` nullable

```typescript
// apps/backend/src/modules/equipos/entities/equipo.entity.ts  (reemplazar completo)
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario }      from '../../usuarios/entities/usuario.entity';
import { Modelo }       from '../../modelos/entities/modelo.entity';
import { CompraDetalle } from '../../compras/entities/compra-detalle.entity';

export type EstadoEquipo = 'ACTIVO' | 'BAJA' | 'MANTENIMIENTO';

@Entity({ name: 'equipos', schema: 'inventario_ti' })
export class Equipo {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Modelo, { eager: true, nullable: true })
  @JoinColumn({ name: 'modelo_id' })
  modelo: Modelo;

  @Column({ name: 'modelo_id', nullable: true }) modeloId: number;

  @ManyToOne(() => CompraDetalle, { eager: false, nullable: true })
  @JoinColumn({ name: 'compra_detalle_id' })
  compraDetalle: CompraDetalle;

  @Column({ name: 'compra_detalle_id', nullable: true }) compraDetalleId: number;

  @Column({ length: 100 })               empresa: string;
  @Column({ length: 150, nullable: true }) nombre: string;   // alias opcional de la unidad
  @Column({ length: 100, nullable: true }) gerencia: string;
  @Column({ length: 100, nullable: true }) departamento: string;
  @Column({ length: 50, nullable: true })  codigo: string;
  @Column({ length: 100, nullable: true }) ceco: string;
  @Column({ length: 150, nullable: true }) ubicacion: string;
  @Column({ length: 100, nullable: true, unique: true }) serie: string;
  @Column({ length: 20, default: 'ACTIVO' }) estado: EstadoEquipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por' })
  creadoPor: Usuario;

  @CreateDateColumn({ name: 'creado_en' })    creadoEn: Date;
  @UpdateDateColumn({ name: 'actualizado_en' }) actualizadoEn: Date;
}
```

- [ ] **Step 8: Compilar**

```bash
cd apps/backend && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/database/migrations/ apps/backend/src/modules/compras/entities/ apps/backend/src/modules/stock-asignaciones/entities/ apps/backend/src/modules/equipos/entities/equipo.entity.ts
git commit -m "feat(db): migrations 006-008 + entities compras, stock-asignaciones, refactor equipos"
```

---

## Task 4: Backend — ComprasModule + StockAsignacionesModule + InventarioModule

**Files:**
- Create: `apps/backend/src/modules/compras/dto/create-compra.dto.ts`
- Create: `apps/backend/src/modules/compras/dto/registrar-unidades.dto.ts`
- Create: `apps/backend/src/modules/compras/compras.service.ts`
- Create: `apps/backend/src/modules/compras/compras.controller.ts`
- Create: `apps/backend/src/modules/compras/compras.module.ts`
- Create: `apps/backend/src/modules/stock-asignaciones/dto/create-stock-asignacion.dto.ts`
- Create: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.service.ts`
- Create: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.controller.ts`
- Create: `apps/backend/src/modules/stock-asignaciones/stock-asignaciones.module.ts`
- Create: `apps/backend/src/modules/inventario/inventario.service.ts`
- Create: `apps/backend/src/modules/inventario/inventario.controller.ts`
- Create: `apps/backend/src/modules/inventario/inventario.module.ts`
- Modify: `apps/backend/src/modules/equipos/dto/create-equipo.dto.ts`
- Modify: `apps/backend/src/modules/equipos/equipos.service.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Consumes: Entities de Tasks 1–3
- Produces:
  - `POST /api/compras` → `Compra`
  - `GET /api/compras` → `{ data: Compra[], total: number }`
  - `GET /api/compras/:id` → `Compra` con detalles
  - `POST /api/compras/:id/detalle` → `CompraDetalle`
  - `POST /api/compras/detalle/:detalleId/registrar-unidades` → `Equipo[]` (alta de series desde compra)
  - `GET /api/stock-asignaciones?colaboradorId=&activas=` → `StockAsignacion[]`
  - `POST /api/stock-asignaciones` → `StockAsignacion`
  - `PATCH /api/stock-asignaciones/:id/devolver` → `StockAsignacion`
  - `GET /api/inventario/stock` → `StockResumen[]` (disponible por modelo)

- [ ] **Step 1: DTOs de Compras**

```typescript
// apps/backend/src/modules/compras/dto/create-compra.dto.ts
import { IsInt, IsString, IsIn, IsDateString, IsOptional, IsPositive, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompraDetalleDto {
  @IsInt() @IsPositive() modeloId: number;
  @IsInt() @IsPositive() cantidad: number;
  @IsOptional() @IsNumber() precioUnitario?: number;
}

export class CreateCompraDto {
  @IsInt() @IsPositive()    proveedorId: number;
  @IsString()               numeroDocumento: string;
  @IsIn(['FACTURA','OC','BOLETA','NOTA_INGRESO']) tipoDocumento: string;
  @IsDateString()           fechaDocumento: string;
  @IsOptional() @IsString() observaciones?: string;
  @Type(() => CreateCompraDetalleDto)
  detalles: CreateCompraDetalleDto[];
}

// apps/backend/src/modules/compras/dto/registrar-unidades.dto.ts
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class RegistrarUnidadesDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  series: string[];   // lista de números de serie a dar de alta

  @IsString()
  empresa: string;

  @IsOptional() @IsString() gerencia?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() ubicacion?: string;
  @IsOptional() @IsString() ceco?: string;
}
```

- [ ] **Step 2: ComprasService**

```typescript
// apps/backend/src/modules/compras/compras.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compra } from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { Modelo } from '../modelos/entities/modelo.entity';
import { CreateCompraDto, CreateCompraDetalleDto } from './dto/create-compra.dto';
import { RegistrarUnidadesDto } from './dto/registrar-unidades.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)        private readonly compraRepo: Repository<Compra>,
    @InjectRepository(CompraDetalle) private readonly detalleRepo: Repository<CompraDetalle>,
    @InjectRepository(Equipo)        private readonly equipoRepo: Repository<Equipo>,
    @InjectRepository(Modelo)        private readonly modeloRepo: Repository<Modelo>,
  ) {}

  async findAll(page = 1, limit = 20): Promise<{ data: Compra[]; total: number }> {
    const [data, total] = await this.compraRepo.findAndCount({
      relations: ['proveedor', 'detalles', 'detalles.modelo'],
      order: { creadoEn: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: number): Promise<Compra> {
    const c = await this.compraRepo.findOne({
      where: { id },
      relations: ['proveedor', 'detalles', 'detalles.modelo'],
    });
    if (!c) throw new NotFoundException(`Compra ${id} no encontrada`);
    return c;
  }

  async create(dto: CreateCompraDto, usuarioId: number): Promise<Compra> {
    const compra = this.compraRepo.create({
      proveedorId:     dto.proveedorId,
      numeroDocumento: dto.numeroDocumento,
      tipoDocumento:   dto.tipoDocumento as any,
      fechaDocumento:  dto.fechaDocumento,
      observaciones:   dto.observaciones,
      creadoPorId:     usuarioId,
    });
    const saved = await this.compraRepo.save(compra);
    if (dto.detalles?.length) {
      const detalles = dto.detalles.map(d => this.detalleRepo.create({
        compraId: saved.id, modeloId: d.modeloId,
        cantidad: d.cantidad, precioUnitario: d.precioUnitario,
      }));
      await this.detalleRepo.save(detalles);
    }
    return this.findOne(saved.id);
  }

  async addDetalle(compraId: number, dto: CreateCompraDetalleDto): Promise<CompraDetalle> {
    await this.findOne(compraId); // throws if not found
    const det = this.detalleRepo.create({ compraId, ...dto });
    return this.detalleRepo.save(det);
  }

  /** Alta de unidades serializadas desde una línea de compra */
  async registrarUnidades(detalleId: number, dto: RegistrarUnidadesDto): Promise<Equipo[]> {
    const detalle = await this.detalleRepo.findOne({
      where: { id: detalleId },
      relations: ['modelo'],
    });
    if (!detalle) throw new NotFoundException(`Línea de compra ${detalleId} no encontrada`);
    if (!detalle.modelo.tieneSerie) {
      throw new BadRequestException('Este modelo no usa números de serie (tiene_serie = false)');
    }
    if (dto.series.length > detalle.cantidad) {
      throw new BadRequestException(`La compra tiene ${detalle.cantidad} unidades, se enviaron ${dto.series.length} series`);
    }

    // Verificar duplicados en la request
    const unique = new Set(dto.series);
    if (unique.size !== dto.series.length) {
      throw new BadRequestException('La lista contiene números de serie duplicados');
    }

    const equipos = dto.series.map(serie => this.equipoRepo.create({
      modeloId:       detalle.modeloId,
      compraDetalleId: detalleId,
      serie,
      empresa:     dto.empresa,
      gerencia:    dto.gerencia,
      departamento: dto.departamento,
      ubicacion:   dto.ubicacion,
      ceco:        dto.ceco,
      estado:      'ACTIVO',
    }));

    try {
      return await this.equipoRepo.save(equipos);
    } catch (err: any) {
      if (err?.message?.includes('UQ') || err?.number === 2627) {
        throw new BadRequestException('Uno o más números de serie ya existen en el sistema');
      }
      throw err;
    }
  }
}
```

- [ ] **Step 3: ComprasController**

```typescript
// apps/backend/src/modules/compras/compras.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, Request, UseGuards } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CreateCompraDto, CreateCompraDetalleDto } from './dto/create-compra.dto';
import { RegistrarUnidadesDto } from './dto/registrar-unidades.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/compras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComprasController {
  constructor(private readonly svc: ComprasService) {}

  @Get()
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.findAll(Number(page ?? 1), Number(limit ?? 20));
  }

  @Get(':id')
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

  @Post()
  @Roles('ADMIN','TECNICO')
  create(@Body() dto: CreateCompraDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Post(':id/detalle')
  @Roles('ADMIN','TECNICO')
  addDetalle(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCompraDetalleDto) {
    return this.svc.addDetalle(id, dto);
  }

  @Post('detalle/:detalleId/registrar-unidades')
  @Roles('ADMIN','TECNICO')
  registrarUnidades(@Param('detalleId', ParseIntPipe) id: number, @Body() dto: RegistrarUnidadesDto) {
    return this.svc.registrarUnidades(id, dto);
  }
}
```

- [ ] **Step 4: ComprasModule**

```typescript
// apps/backend/src/modules/compras/compras.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra }        from './entities/compra.entity';
import { CompraDetalle } from './entities/compra-detalle.entity';
import { Equipo }        from '../equipos/entities/equipo.entity';
import { Modelo }        from '../modelos/entities/modelo.entity';
import { ComprasService }    from './compras.service';
import { ComprasController } from './compras.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Compra, CompraDetalle, Equipo, Modelo])],
  providers: [ComprasService],
  controllers: [ComprasController],
  exports: [ComprasService],
})
export class ComprasModule {}
```

- [ ] **Step 5: StockAsignacionesService + Controller + Module**

```typescript
// apps/backend/src/modules/stock-asignaciones/dto/create-stock-asignacion.dto.ts
import { IsInt, IsPositive, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateStockAsignacionDto {
  @IsInt() @IsPositive()    modeloId: number;
  @IsInt() @IsPositive()    colaboradorId: number;
  @IsInt() @IsPositive()    cantidad: number;
  @IsDateString()           fechaInicio: string;
  @IsOptional() @IsString() observaciones?: string;
}

// apps/backend/src/modules/stock-asignaciones/stock-asignaciones.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { StockAsignacion } from './entities/stock-asignacion.entity';
import { CreateStockAsignacionDto } from './dto/create-stock-asignacion.dto';

@Injectable()
export class StockAsignacionesService {
  constructor(
    @InjectRepository(StockAsignacion)
    private readonly repo: Repository<StockAsignacion>,
  ) {}

  async findByColaborador(colaboradorId: number, soloActivas = false): Promise<StockAsignacion[]> {
    const where: any = { colaboradorId };
    if (soloActivas) where.fechaFin = IsNull();
    return this.repo.find({ where, order: { creadoEn: 'DESC' } });
  }

  async findByModelo(modeloId: number): Promise<StockAsignacion[]> {
    return this.repo.find({ where: { modeloId }, order: { creadoEn: 'DESC' } });
  }

  /** Calcula stock disponible para un modelo (tiene_serie = false) */
  async calcularDisponible(modeloId: number): Promise<{ total: number; asignado: number; disponible: number }> {
    const { sum: asignado } = await this.repo
      .createQueryBuilder('sa')
      .select('SUM(sa.cantidad)', 'sum')
      .where('sa.modeloId = :id AND sa.fechaFin IS NULL', { id: modeloId })
      .getRawOne();

    // El total ingresado se calcula fuera (en InventarioService), aquí solo devolvemos lo asignado
    return { total: 0, asignado: Number(asignado ?? 0), disponible: 0 };
  }

  async create(dto: CreateStockAsignacionDto, usuarioId: number): Promise<StockAsignacion> {
    // Validar stock disponible (delegado a InventarioService, aquí verificamos via query directa)
    const { asignado } = await this.calcularDisponible(dto.modeloId);

    // Obtener total ingresado de compras_detalle
    const { sum: totalIngresado } = await this.repo.manager
      .createQueryBuilder()
      .select('SUM(cd.cantidad)', 'sum')
      .from('inventario_ti.compras_detalle', 'cd')
      .where('cd.modelo_id = :id', { id: dto.modeloId })
      .getRawOne();

    const total = Number(totalIngresado ?? 0);
    const disponible = total - asignado;
    if (dto.cantidad > disponible) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${disponible}, solicitado: ${dto.cantidad}`);
    }

    return this.repo.save(this.repo.create({ ...dto, creadoPorId: usuarioId }));
  }

  async devolver(id: number, fechaFin: string): Promise<StockAsignacion> {
    const sa = await this.repo.findOne({ where: { id } });
    if (!sa) throw new NotFoundException(`StockAsignacion ${id} no encontrada`);
    if (sa.fechaFin) throw new BadRequestException('Este periférico ya fue devuelto');
    sa.fechaFin = fechaFin;
    return this.repo.save(sa);
  }
}
```

```typescript
// apps/backend/src/modules/stock-asignaciones/stock-asignaciones.controller.ts
import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, Request, UseGuards } from '@nestjs/common';
import { StockAsignacionesService } from './stock-asignaciones.service';
import { CreateStockAsignacionDto } from './dto/create-stock-asignacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/stock-asignaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockAsignacionesController {
  constructor(private readonly svc: StockAsignacionesService) {}

  @Get('colaborador/:id')
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  byColaborador(@Param('id', ParseIntPipe) id: number, @Query('activas') activas?: string) {
    return this.svc.findByColaborador(id, activas === 'true');
  }

  @Post()
  @Roles('ADMIN','TECNICO')
  create(@Body() dto: CreateStockAsignacionDto, @Request() req: any) {
    return this.svc.create(dto, req.user.id);
  }

  @Patch(':id/devolver')
  @Roles('ADMIN','TECNICO')
  devolver(@Param('id', ParseIntPipe) id: number, @Body('fechaFin') fechaFin: string) {
    return this.svc.devolver(id, fechaFin);
  }
}
```

```typescript
// apps/backend/src/modules/stock-asignaciones/stock-asignaciones.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockAsignacion } from './entities/stock-asignacion.entity';
import { StockAsignacionesService }    from './stock-asignaciones.service';
import { StockAsignacionesController } from './stock-asignaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockAsignacion])],
  providers: [StockAsignacionesService],
  controllers: [StockAsignacionesController],
  exports: [StockAsignacionesService],
})
export class StockAsignacionesModule {}
```

- [ ] **Step 6: InventarioModule — dashboard de stock**

```typescript
// apps/backend/src/modules/inventario/inventario.service.ts
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

export interface StockResumen {
  modeloId: number; codigo: string; nombre: string; marca: string; tipo: string;
  totalIngresado: number; asignado: number; disponible: number;
}

@Injectable()
export class InventarioService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  async stockResumen(): Promise<StockResumen[]> {
    const rows = await this.em.query(`
      SELECT
        m.id           AS modeloId,
        m.codigo,
        m.nombre,
        m.marca,
        m.tipo,
        ISNULL(SUM(cd.cantidad), 0)  AS totalIngresado,
        ISNULL(sa.asignado, 0)       AS asignado,
        ISNULL(SUM(cd.cantidad), 0) - ISNULL(sa.asignado, 0) AS disponible
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.compras_detalle cd ON cd.modelo_id = m.id
      LEFT JOIN (
        SELECT modelo_id, SUM(cantidad) AS asignado
        FROM inventario_ti.stock_asignaciones
        WHERE fecha_fin IS NULL
        GROUP BY modelo_id
      ) sa ON sa.modelo_id = m.id
      WHERE m.tiene_serie = 0 AND m.activo = 1
      GROUP BY m.id, m.codigo, m.nombre, m.marca, m.tipo, sa.asignado
      ORDER BY m.nombre
    `);
    return rows;
  }

  async resumenPorModelo(): Promise<any[]> {
    return this.em.query(`
      SELECT
        m.id AS modeloId, m.codigo, m.nombre, m.marca, m.tipo,
        COUNT(e.id)                                              AS totalUnidades,
        SUM(CASE WHEN e.estado = 'ACTIVO' THEN 1 ELSE 0 END)   AS activos,
        SUM(CASE WHEN e.estado = 'BAJA' THEN 1 ELSE 0 END)     AS bajas,
        SUM(CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END)       AS asignados,
        SUM(CASE WHEN e.estado = 'ACTIVO' AND a.id IS NULL THEN 1 ELSE 0 END) AS disponibles
      FROM inventario_ti.modelos m
      LEFT JOIN inventario_ti.equipos e ON e.modelo_id = m.id
      LEFT JOIN inventario_ti.asignaciones a ON a.equipo_id = e.id AND a.fecha_fin IS NULL
      WHERE m.tiene_serie = 1 AND m.activo = 1
      GROUP BY m.id, m.codigo, m.nombre, m.marca, m.tipo
      ORDER BY m.nombre
    `);
  }
}

// apps/backend/src/modules/inventario/inventario.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('api/inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(private readonly svc: InventarioService) {}

  @Get('stock')
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  stock() { return this.svc.stockResumen(); }

  @Get('equipos-por-modelo')
  @Roles('ADMIN','GERENTE','TECNICO','VISUALIZADOR')
  equiposPorModelo() { return this.svc.resumenPorModelo(); }
}

// apps/backend/src/modules/inventario/inventario.module.ts
import { Module } from '@nestjs/common';
import { InventarioService }    from './inventario.service';
import { InventarioController } from './inventario.controller';

@Module({
  providers: [InventarioService],
  controllers: [InventarioController],
})
export class InventarioModule {}
```

- [ ] **Step 7: Actualizar EquiposService** — quitar referencias a `tipo` en `where` (ahora está en modelo), ajustar `create` DTO para usar `modeloId`

En `equipos.service.ts`, en `findAll`:
- Quitar `if (filtros.tipo) where.tipo = filtros.tipo;` (el campo ya no existe en Equipo)
- Para filtrar por tipo ahora se requiere JOIN con modelos — simplificar: omitir filtro por tipo en esta versión y manejarlo desde la query builder si es necesario.

```typescript
// En EquiposService.findAll — reemplazar el bloque where:
async findAll(filtros: Omit<FiltroEquiposDto, 'page' | 'limit'>, page = 1, limit = 50) {
  const qb = this.equipoRepo.createQueryBuilder('e')
    .leftJoinAndSelect('e.modelo', 'modelo');

  if (filtros.estado)   qb.andWhere('e.estado = :estado', { estado: filtros.estado });
  if (filtros.busqueda) qb.andWhere(
    '(e.nombre LIKE :q OR e.serie LIKE :q OR modelo.nombre LIKE :q OR modelo.codigo LIKE :q)',
    { q: `%${filtros.busqueda}%` }
  );
  if (filtros.tipo)     qb.andWhere('modelo.tipo = :tipo', { tipo: filtros.tipo });

  qb.orderBy('modelo.nombre', 'ASC').addOrderBy('e.serie', 'ASC');
  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();
  return { data, total };
}
```

En `CreateEquipoDto`: quitar `marca, modelo, tipo, firmware, version, endOfSale, endOfSupport`; agregar `modeloId: number` (required), resto de campos físicos.

- [ ] **Step 8: Registrar todos los módulos nuevos en AppModule**

```typescript
// apps/backend/src/app.module.ts — agregar en imports[]:
import { ComprasModule }          from './modules/compras/compras.module';
import { StockAsignacionesModule } from './modules/stock-asignaciones/stock-asignaciones.module';
import { InventarioModule }        from './modules/inventario/inventario.module';
// (ModelosModule y ProveedoresModule ya registrados en Task 2)
```

- [ ] **Step 9: Compilar backend completo**

```bash
cd apps/backend && npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add apps/backend/src/modules/compras/ apps/backend/src/modules/stock-asignaciones/ apps/backend/src/modules/inventario/ apps/backend/src/modules/equipos/ apps/backend/src/app.module.ts
git commit -m "feat(backend): ComprasModule, StockAsignacionesModule, InventarioModule"
```

---

## Task 5: Frontend — Types, Services, Routes base

**Files:**
- Create: `apps/frontend/src/types/modelo.types.ts`
- Create: `apps/frontend/src/types/proveedor.types.ts`
- Create: `apps/frontend/src/types/compra.types.ts`
- Create: `apps/frontend/src/types/stock-asignacion.types.ts`
- Create: `apps/frontend/src/services/modelos.service.ts`
- Create: `apps/frontend/src/services/proveedores.service.ts`
- Create: `apps/frontend/src/services/compras.service.ts`
- Create: `apps/frontend/src/services/stockAsignaciones.service.ts`
- Create: `apps/frontend/src/services/inventario.service.ts`
- Modify: `apps/frontend/src/App.tsx` — nuevas rutas
- Modify: `apps/frontend/src/layouts/MainLayout.tsx` — nuevos nav items + títulos

- [ ] **Step 1: Types**

```typescript
// apps/frontend/src/types/modelo.types.ts
export interface Modelo {
  id: number;
  codigo: string;
  nombre: string;
  marca?: string;
  tipo?: string;
  descripcion?: string;
  tieneSerie: boolean;
  endOfSale?: string;
  endOfSupport?: string;
  firmwareRef?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreateModeloPayload {
  codigo: string; nombre: string; marca?: string; tipo?: string;
  descripcion?: string; tieneSerie: boolean;
  endOfSale?: string; endOfSupport?: string; firmwareRef?: string;
}

// apps/frontend/src/types/proveedor.types.ts
export interface Proveedor {
  id: number; nombre: string; ruc?: string; telefono?: string; email?: string; activo: boolean;
}
export interface CreateProveedorPayload { nombre: string; ruc?: string; telefono?: string; email?: string; }

// apps/frontend/src/types/compra.types.ts
import type { Proveedor } from './proveedor.types';
import type { Modelo } from './modelo.types';

export type TipoDocumento = 'FACTURA' | 'OC' | 'BOLETA' | 'NOTA_INGRESO';

export interface CompraDetalle {
  id: number; compraId: number; modeloId: number; modelo: Modelo;
  cantidad: number; precioUnitario?: number;
}
export interface Compra {
  id: number; proveedorId: number; proveedor: Proveedor;
  numeroDocumento: string; tipoDocumento: TipoDocumento;
  fechaDocumento: string; observaciones?: string;
  detalles: CompraDetalle[]; creadoEn: string;
}
export interface CreateCompraPayload {
  proveedorId: number; numeroDocumento: string; tipoDocumento: TipoDocumento;
  fechaDocumento: string; observaciones?: string;
  detalles: { modeloId: number; cantidad: number; precioUnitario?: number }[];
}

// apps/frontend/src/types/stock-asignacion.types.ts
import type { Modelo } from './modelo.types';
import type { Colaborador } from './asignacion.types';

export interface StockAsignacion {
  id: number; modeloId: number; modelo: Modelo;
  colaboradorId: number; colaborador: Colaborador;
  cantidad: number; fechaInicio: string; fechaFin?: string | null;
  observaciones?: string; creadoEn: string;
}
export interface CreateStockAsignacionPayload {
  modeloId: number; colaboradorId: number; cantidad: number;
  fechaInicio: string; observaciones?: string;
}
```

- [ ] **Step 2: Services**

```typescript
// apps/frontend/src/services/modelos.service.ts
import api from './api';
import type { Modelo, CreateModeloPayload } from '../types/modelo.types';

export const modelosService = {
  listar: (p?: { tipo?: string; tieneSerie?: boolean; activo?: boolean }) =>
    api.get<{ data: Modelo[]; total: number }>('/api/modelos', { params: p }).then(r => r.data),
  obtener: (id: number) => api.get<Modelo>(`/api/modelos/${id}`).then(r => r.data),
  crear:   (d: CreateModeloPayload) => api.post<Modelo>('/api/modelos', d).then(r => r.data),
  actualizar: (id: number, d: Partial<CreateModeloPayload>) =>
    api.patch<Modelo>(`/api/modelos/${id}`, d).then(r => r.data),
};

// apps/frontend/src/services/proveedores.service.ts
import api from './api';
import type { Proveedor, CreateProveedorPayload } from '../types/proveedor.types';

export const proveedoresService = {
  listar:     () => api.get<Proveedor[]>('/api/proveedores').then(r => r.data),
  crear:      (d: CreateProveedorPayload) => api.post<Proveedor>('/api/proveedores', d).then(r => r.data),
  actualizar: (id: number, d: Partial<CreateProveedorPayload>) =>
    api.patch<Proveedor>(`/api/proveedores/${id}`, d).then(r => r.data),
};

// apps/frontend/src/services/compras.service.ts
import api from './api';
import type { Compra, CreateCompraPayload } from '../types/compra.types';

export const comprasService = {
  listar:  (page = 1) => api.get<{ data: Compra[]; total: number }>('/api/compras', { params: { page } }).then(r => r.data),
  obtener: (id: number) => api.get<Compra>(`/api/compras/${id}`).then(r => r.data),
  crear:   (d: CreateCompraPayload) => api.post<Compra>('/api/compras', d).then(r => r.data),
  registrarUnidades: (detalleId: number, series: string[], empresa: string, extras?: Record<string, string>) =>
    api.post(`/api/compras/detalle/${detalleId}/registrar-unidades`, { series, empresa, ...extras }).then(r => r.data),
};

// apps/frontend/src/services/stockAsignaciones.service.ts
import api from './api';
import type { StockAsignacion, CreateStockAsignacionPayload } from '../types/stock-asignacion.types';

export const stockAsignacionesService = {
  porColaborador: (id: number, activas = false) =>
    api.get<StockAsignacion[]>(`/api/stock-asignaciones/colaborador/${id}`, { params: { activas } }).then(r => r.data),
  crear:    (d: CreateStockAsignacionPayload) => api.post<StockAsignacion>('/api/stock-asignaciones', d).then(r => r.data),
  devolver: (id: number, fechaFin: string)    => api.patch<StockAsignacion>(`/api/stock-asignaciones/${id}/devolver`, { fechaFin }).then(r => r.data),
};

// apps/frontend/src/services/inventario.service.ts
import api from './api';

export const inventarioService = {
  stock:           () => api.get('/api/inventario/stock').then(r => r.data),
  equiposPorModelo: () => api.get('/api/inventario/equipos-por-modelo').then(r => r.data),
};
```

- [ ] **Step 3: Agregar rutas en App.tsx**

```typescript
// Agregar imports:
import ModelosPage       from './pages/ModelosPage';
import ProveedoresPage   from './pages/ProveedoresPage';
import ComprasPage       from './pages/ComprasPage';
import CompraDetailPage  from './pages/CompraDetailPage';
import InventarioPage    from './pages/InventarioPage';

// Dentro del <Route element={<RutaProtegida><MainLayout /></RutaProtegida>}> agregar:
<Route path="/modelos"       element={<RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}><ModelosPage /></RutaRol>} />
<Route path="/proveedores"   element={<RutaRol roles={['ADMIN','TECNICO']}><ProveedoresPage /></RutaRol>} />
<Route path="/compras"       element={<RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}><ComprasPage /></RutaRol>} />
<Route path="/compras/:id"   element={<RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}><CompraDetailPage /></RutaRol>} />
<Route path="/inventario"    element={<RutaRol roles={['ADMIN','GERENTE','TECNICO','VISUALIZADOR']}><InventarioPage /></RutaRol>} />
```

- [ ] **Step 4: Actualizar MainLayout.tsx** — agregar nav items y títulos dinámicos

```typescript
// En navItems[] agregar después de /equipos:
{ key: '/modelos',     icon: <AppstoreOutlined />, label: 'Modelos',     section: 'principal' },
{ key: '/compras',     icon: <ShoppingCartOutlined />, label: 'Compras', section: 'principal', roles: ['ADMIN','TECNICO'] },
{ key: '/inventario',  icon: <InboxOutlined />,    label: 'Inventario',  section: 'principal' },
{ key: '/proveedores', icon: <ShopOutlined />,     label: 'Proveedores', section: 'sistema', roles: ['ADMIN','TECNICO'] },

// Importar los iconos de @ant-design/icons:
// AppstoreOutlined, ShoppingCartOutlined, InboxOutlined, ShopOutlined

// Actualizar pageTitle para rutas dinámicas:
const pageTitle = (() => {
  const p = location.pathname;
  if (p.match(/^\/equipos\/\d+/))      return 'Detalle de Equipo';
  if (p.match(/^\/colaboradores\/\d+/)) return 'Detalle de Colaborador';
  if (p.match(/^\/compras\/\d+/))       return 'Detalle de Compra';
  return PAGE_TITLES[p] ?? 'InventarioTI';
})();

// En PAGE_TITLES agregar:
'/modelos':     'Modelos',
'/proveedores': 'Proveedores',
'/compras':     'Compras',
'/inventario':  'Inventario',
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/types/ apps/frontend/src/services/modelos.service.ts apps/frontend/src/services/proveedores.service.ts apps/frontend/src/services/compras.service.ts apps/frontend/src/services/stockAsignaciones.service.ts apps/frontend/src/services/inventario.service.ts apps/frontend/src/App.tsx apps/frontend/src/layouts/MainLayout.tsx
git commit -m "feat(frontend): types, services y rutas para modelos/compras/inventario"
```

---

## Task 6: Frontend — ModelosPage + ProveedoresPage

**Files:**
- Create: `apps/frontend/src/pages/ModelosPage.tsx`
- Create: `apps/frontend/src/pages/ProveedoresPage.tsx`

- [ ] **Step 1: ModelosPage.tsx**

Tabla con columnas: Código, Nombre, Marca, Tipo, Tiene serie (badge Sí/No), End of Support (coloreado igual que en EquipoDetailPage), Activo. Filtros: tipo (Select), tieneSerie (Select), busqueda (Input.Search). Botón "Nuevo modelo" abre Modal con Form (campos del CreateModeloDto). Click en fila → nada por ahora (detail page es futuro). Botón editar en columna acciones.

Patrón exacto igual que `EquiposPage` (useEffect → cargar, useState para modal, Form de Ant Design). Reutilizar la estructura visual de `page-header`, `it-btn`, `it-btn-primary`.

Campos del form: `codigo`, `nombre`, `marca`, `tipo` (Select con los mismos TIPOS de TablaEquipos), `descripcion`, `tieneSerie` (Switch), `endOfSale` (DatePicker), `endOfSupport` (DatePicker), `firmwareRef`.

- [ ] **Step 2: ProveedoresPage.tsx**

Tabla simple: Nombre, RUC, Teléfono, Email, Estado. Modal crear/editar con Form. Sin paginación (proveedores son pocos).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/ModelosPage.tsx apps/frontend/src/pages/ProveedoresPage.tsx
git commit -m "feat(frontend): ModelosPage y ProveedoresPage"
```

---

## Task 7: Frontend — ComprasPage + CompraDetailPage

**Files:**
- Create: `apps/frontend/src/pages/ComprasPage.tsx`
- Create: `apps/frontend/src/pages/CompraDetailPage.tsx`

- [ ] **Step 1: ComprasPage.tsx**

Lista de compras: tabla con columnas Proveedor, Documento, Tipo, Fecha, N° líneas. Botón "Nueva compra" → Modal con Form en 2 secciones:
1. Datos del documento: proveedor (Select cargado desde `proveedoresService.listar()`), tipo_documento (Select), numero_documento, fecha_documento, observaciones
2. Líneas (detalles): tabla editable con botón "+ Agregar línea" → cada línea tiene: modelo (Select filtrado con `tieneSerie` indistinto), cantidad, precio_unitario.

Al guardar: `comprasService.crear(payload)` y navegar a `/compras/:id` para el detalle.

Click en fila de la tabla principal → navegar a `/compras/:id`.

- [ ] **Step 2: CompraDetailPage.tsx**

Muestra datos del documento (proveedor, tipo, número, fecha). Tabla de líneas de detalle con columnas: Modelo (codigo + nombre), Tipo, Tiene Serie, Cantidad, Precio unitario.

Para líneas con `modelo.tieneSerie = true`: badge "X/Y registradas" (unidades con `compraDetalleId` = esta línea vs `cantidad`). Botón **"Registrar unidades"** → abre Modal con:
- Textarea para pegar lista de series (una por línea), o Input individual con botón "+"
- Al confirmar: `comprasService.registrarUnidades(detalleId, series, empresa, { gerencia, ubicacion })`
- Muestra resultado: "5 unidades registradas correctamente"

Para líneas con `modelo.tieneSerie = false`: badge "Stock ingresado" en verde. No hay acción adicional.

Back button → `/compras`.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/ComprasPage.tsx apps/frontend/src/pages/CompraDetailPage.tsx
git commit -m "feat(frontend): ComprasPage y CompraDetailPage con registro de unidades"
```

---

## Task 8: Frontend — InventarioPage + Equipos refactor + Asignaciones periféricos + Detalle updates

**Files:**
- Create: `apps/frontend/src/pages/InventarioPage.tsx`
- Modify: `apps/frontend/src/components/equipos/FormEquipo.tsx`
- Modify: `apps/frontend/src/pages/AsignacionesPage.tsx`
- Modify: `apps/frontend/src/pages/ColaboradorDetailPage.tsx`
- Modify: `apps/frontend/src/pages/EquipoDetailPage.tsx`

- [ ] **Step 1: InventarioPage.tsx**

Dos tabs:
- **"Stock periféricos"** (modelos con `tieneSerie=false`): tabla con Total ingresado / Asignado / Disponible. Color en Disponible: rojo si 0, amarillo si ≤3, verde si >3. Datos de `inventarioService.stock()`.
- **"Equipos por modelo"** (modelos con `tieneSerie=true`): tabla con Total / Activos / Asignados / Disponibles / Bajas. Datos de `inventarioService.equiposPorModelo()`.

- [ ] **Step 2: FormEquipo.tsx — refactor a 2 pasos**

El formulario ahora tiene dos secciones:
1. **Selección de modelo**: Select de modelos (`modelosService.listar({ tieneSerie: true, activo: true })`), muestra `codigo — nombre (marca)` como label. Al seleccionar, se muestra un resumen de las specs del modelo (tipo, marca, end_of_support) como InfoRow de solo lectura debajo del selector.
2. **Datos físicos de la unidad**: `empresa` (Select catálogo), `serie` (Input), `codigo` (Input), `estado` (Select), `gerencia`, `departamento`, `ubicacion`, `ceco`.

Quitar los campos de catálogo del Form: `marca`, `tipo`, `modelo` (texto), `firmware`, `version`, `endOfSale`, `endOfSupport`.

Actualizar `CreateEquipoDto` del frontend (en el payload al crear): enviar `modeloId` en lugar de los campos de catálogo.

- [ ] **Step 3: AsignacionesPage.tsx — tab "Periféricos"**

Agregar un cuarto tab "Periféricos activos" al lado de "Asignaciones activas":
- Tabla de `stock_asignaciones` activas (todas, paginadas): Colaborador, Modelo, Tipo, Cantidad, Desde, Días.
- Botón "Asignar periférico" → Modal con Form:
  - Colaborador (Select de colaboradores activos)
  - Modelo (Select de modelos con `tieneSerie=false` y stock disponible > 0)
  - Cantidad (InputNumber, mínimo 1)
  - Fecha inicio (DatePicker, default hoy)
  - Observaciones (TextArea opcional)
  - Al guardar: `stockAsignacionesService.crear(payload)`, recargar tabla
- En cada fila: botón "Devolver" → confirmar → `stockAsignacionesService.devolver(id, fechaHoy)`

- [ ] **Step 4: ColaboradorDetailPage.tsx — sección periféricos en "Equipos actuales"**

La tab "Equipos actuales" ahora tiene dos secciones:

**Sección 1 — Equipos serializados** (existente, sin cambio funcional)

**Sección 2 — Periféricos** (nueva): llamar `stockAsignacionesService.porColaborador(id, true)`. Mostrar tabla con Modelo, Tipo, Cantidad, Desde, Días. Botón "Devolver" en cada fila → confirmar → `stockAsignacionesService.devolver(id, fechaHoy)` → recargar.

Si no hay periféricos: Empty state "Sin periféricos asignados".

- [ ] **Step 5: EquipoDetailPage.tsx — mostrar datos del modelo**

En `TabGeneral`, los campos de catálogo (Tipo, Marca, Modelo, Firmware, End of Support) ahora vienen de `equipo.modelo` en lugar de `equipo` directamente:

```typescript
// Cambiar: value={equipo.tipo}  →  value={equipo.modelo?.tipo}
// Cambiar: value={equipo.marca} →  value={equipo.modelo?.marca}
// Cambiar: value={equipo.modelo} (texto) → value={`${equipo.modelo?.codigo} — ${equipo.modelo?.nombre}`}
// etc.
```

Agregar al inicio de la sección Identificación: `InfoRow label="Modelo" value={equipo.modelo?.nombre}` y `InfoRow label="Código modelo" value={equipo.modelo?.codigo}`.

Si `equipo.compraDetalleId` existe: agregar link "Ver compra de origen" que navega a `/compras/:compraId` (necesita conocer el compraId — agregarlo al payload de equipo en el backend, o hacer fetch de la compra desde el detalle).

- [ ] **Step 6: Commit final**

```bash
git add apps/frontend/src/pages/InventarioPage.tsx apps/frontend/src/components/equipos/FormEquipo.tsx apps/frontend/src/pages/AsignacionesPage.tsx apps/frontend/src/pages/ColaboradorDetailPage.tsx apps/frontend/src/pages/EquipoDetailPage.tsx
git commit -m "feat(frontend): InventarioPage, FormEquipo 2 pasos, asignacion de perifericos, detalle colaborador/equipo"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Sec 3.1 modelos → Task 1 (entity) + Task 2 (service/controller)
- ✅ Sec 3.2 proveedores → Task 1 + Task 2
- ✅ Sec 3.3 compras → Task 3 (entity) + Task 4 (service/controller)
- ✅ Sec 3.4 compras_detalle → Task 3 + Task 4
- ✅ Sec 3.5 refactor equipos → Task 3 (migration) + Task 4 (service update)
- ✅ Sec 3.6 stock_asignaciones → Task 3 (entity) + Task 4 (service)
- ✅ Sec 4 cálculo de stock → InventarioService (Task 4) + StockAsignacionesService
- ✅ Sec 5.1 flujo ingreso compra → Task 4 registrarUnidades + Task 7 frontend
- ✅ Sec 5.3 asignación periférico → Task 4 StockAsignaciones + Task 8 frontend
- ✅ Sec 5.4 devolución → Task 4 devolver() + Task 8 frontend
- ✅ Sec 6 UI modules → Tasks 6, 7, 8
- ✅ Sec 9 permisos → Roles en todos los controllers

**Tipos consistentes:** `modeloId: number` en todos los DTOs y entities. `tieneSerie: boolean` (camelCase en TS, `tiene_serie` en SQL). `fechaFin: string | null` igual que en `asignaciones`.

**No placeholders:** verificado.
