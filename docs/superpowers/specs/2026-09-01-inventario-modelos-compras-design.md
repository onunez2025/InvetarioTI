# Diseño: Módulo de Modelos, Compras e Inventario

**Fecha:** 2026-09-01  
**Estado:** Aprobado — pendiente de implementación  
**Proyecto:** InventarioTI — MT INDUSTRIAL S.A.C.

---

## 1. Contexto y motivación

El sistema actual mezcla los atributos del producto (marca, modelo, tipo, lifecycle) con los de la unidad física en una sola tabla `equipos`. No hay registro de compras/proveedores, ni gestión de stock para periféricos sin número de serie (ratones, teclados, cargadores, celulares). Las asignaciones múltiples por colaborador son técnicamente posibles pero no están expuestas claramente en la UI.

Este diseño introduce:
- Catálogo de modelos separado de las unidades físicas
- Registro de compras con proveedor, documento y líneas de detalle
- Inventario de stock para periféricos sin serie con trazabilidad completa (quién tiene qué)
- Alta de unidades serializadas vinculada al documento de compra

---

## 2. No-goals (fuera de alcance)

- Integración con sistemas contables o ERP externos
- Gestión de órdenes de compra hacia proveedores (solo registro de documentos recibidos)
- Control de garantías por unidad (puede agregarse después)
- Módulo de alertas de stock mínimo (fase siguiente)

---

## 3. Modelo de datos

### 3.1 Tabla `modelos` (nueva)

Catálogo de productos. Cada fila describe **qué** es el producto, no **cuál** unidad física.

```sql
CREATE TABLE inventario_ti.modelos (
  id               INT IDENTITY PRIMARY KEY,
  codigo           VARCHAR(50)  NOT NULL UNIQUE,   -- ej: "HP-450-G10", "LOG-M90"
  nombre           VARCHAR(150) NOT NULL,           -- ej: "HP ProBook 450 G10"
  marca            VARCHAR(100) NULL,
  tipo             VARCHAR(50)  NULL,               -- LAPTOP, SWITCH, MOUSE, CARGADOR, etc.
  descripcion      VARCHAR(500) NULL,
  tiene_serie      BIT          NOT NULL DEFAULT 1, -- 1=serializado, 0=por stock
  end_of_sale      DATE         NULL,
  end_of_support   DATE         NULL,
  firmware_ref     VARCHAR(100) NULL,               -- versión de firmware de referencia
  activo           BIT          NOT NULL DEFAULT 1,
  creado_en        DATETIME2    NOT NULL DEFAULT GETDATE(),
  actualizado_en   DATETIME2    NOT NULL DEFAULT GETDATE()
);
```

### 3.2 Tabla `proveedores` (nueva)

```sql
CREATE TABLE inventario_ti.proveedores (
  id         INT IDENTITY PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  ruc        VARCHAR(20)  NULL,
  telefono   VARCHAR(30)  NULL,
  email      VARCHAR(100) NULL,
  activo     BIT          NOT NULL DEFAULT 1,
  creado_en  DATETIME2    NOT NULL DEFAULT GETDATE()
);
```

### 3.3 Tabla `compras` (nueva)

Un documento de compra (factura, OC, boleta, nota de ingreso).

```sql
CREATE TABLE inventario_ti.compras (
  id                INT IDENTITY PRIMARY KEY,
  proveedor_id      INT          NOT NULL REFERENCES inventario_ti.proveedores(id),
  numero_documento  VARCHAR(50)  NOT NULL,
  tipo_documento    VARCHAR(20)  NOT NULL  -- FACTURA | OC | BOLETA | NOTA_INGRESO
    CHECK (tipo_documento IN ('FACTURA','OC','BOLETA','NOTA_INGRESO')),
  fecha_documento   DATE         NOT NULL,
  observaciones     VARCHAR(500) NULL,
  creado_por        INT          NULL REFERENCES inventario_ti.usuarios(id),
  creado_en         DATETIME2    NOT NULL DEFAULT GETDATE()
);
```

### 3.4 Tabla `compras_detalle` (nueva)

Líneas del documento. Una línea por modelo adquirido.

```sql
CREATE TABLE inventario_ti.compras_detalle (
  id               INT IDENTITY PRIMARY KEY,
  compra_id        INT            NOT NULL REFERENCES inventario_ti.compras(id),
  modelo_id        INT            NOT NULL REFERENCES inventario_ti.modelos(id),
  cantidad         INT            NOT NULL CHECK (cantidad > 0),
  precio_unitario  DECIMAL(12,2)  NULL
);
```

### 3.5 Tabla `equipos` (refactorizada)

Pasa a ser **unidad física pura**. Se eliminan los campos de catálogo que migran a `modelos`. Se agrega `modelo_id` y `compra_detalle_id`.

**Columnas que se eliminan:** `marca`, `modelo` (texto), `tipo`, `firmware`, `version`, `end_of_sale`, `end_of_support`.  
**Columnas que se agregan:** `modelo_id`, `compra_detalle_id`.

```sql
ALTER TABLE inventario_ti.equipos
  ADD modelo_id        INT NULL REFERENCES inventario_ti.modelos(id),
      compra_detalle_id INT NULL REFERENCES inventario_ti.compras_detalle(id);

ALTER TABLE inventario_ti.equipos
  DROP COLUMN marca, modelo, tipo, firmware, version, end_of_sale, end_of_support;
```

> **Nota de migración:** La tabla está vacía al momento de implementar este diseño. No hay datos históricos que transformar. La migración es solo DDL.

Esquema resultante de `equipos`:
```
id, modelo_id, compra_detalle_id, empresa, gerencia, departamento,
serie (UNIQUE), codigo_activo, estado, ubicacion, ceco,
creado_por, creado_en, actualizado_en
```

### 3.6 Tabla `stock_asignaciones` (nueva)

Trazabilidad de periféricos sin serie asignados a colaboradores. Espejo de `asignaciones` pero referencia `modelos` en lugar de `equipos`.

```sql
CREATE TABLE inventario_ti.stock_asignaciones (
  id              INT IDENTITY PRIMARY KEY,
  modelo_id       INT          NOT NULL REFERENCES inventario_ti.modelos(id),
  colaborador_id  INT          NOT NULL REFERENCES inventario_ti.colaboradores(id),
  cantidad        INT          NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  fecha_inicio    DATE         NOT NULL,
  fecha_fin       DATE         NULL,      -- NULL = asignación activa
  observaciones   VARCHAR(500) NULL,
  creado_por      INT          NULL REFERENCES inventario_ti.usuarios(id),
  creado_en       DATETIME2    NOT NULL DEFAULT GETDATE()
);
```

### 3.7 Tabla `asignaciones` (sin cambio de estructura)

La tabla ya soporta múltiples asignaciones simultáneas por colaborador (no hay UNIQUE sobre `colaborador_id`). Solo se actualiza la UI para hacerlo evidente.

---

## 4. Cálculo de stock

### Periféricos (tiene_serie = 0)

```
stock_total     = SUM(compras_detalle.cantidad)
                  WHERE compras_detalle.modelo_id = :id
                    AND modelo.tiene_serie = 0

stock_asignado  = SUM(stock_asignaciones.cantidad)
                  WHERE modelo_id = :id
                    AND fecha_fin IS NULL

disponible      = stock_total - stock_asignado
```

### Equipos serializados (tiene_serie = 1)

```
total           = COUNT(equipos) WHERE modelo_id = :id
asignados       = COUNT(asignaciones activas) WHERE equipo.modelo_id = :id
disponibles     = total - asignados   (estado ACTIVO, sin asignación activa)
en_baja         = COUNT(equipos) WHERE modelo_id = :id AND estado = 'BAJA'
```

---

## 5. Flujos principales

### 5.1 Ingreso de compra con equipos serializados

1. Admin registra `compra` (proveedor, tipo, número, fecha).
2. Agrega líneas en `compras_detalle` (modelo, cantidad, precio).
3. Para cada línea con `modelo.tiene_serie = 1`: botón **"Registrar unidades"** abre un formulario donde se ingresan los números de serie uno a uno o pegando una lista. Cada serie crea una fila en `equipos` con `compra_detalle_id`.
4. Para líneas con `modelo.tiene_serie = 0`: el stock sube automáticamente al guardar la línea. No hay paso adicional.

### 5.2 Asignación de equipo serializado (sin cambio de flujo)

1. En Asignaciones → Nueva asignación.
2. Seleccionar equipo (unidad con serie) + colaborador + fecha.
3. Se crea fila en `asignaciones`.

### 5.3 Asignación de periférico por stock

1. En Asignaciones (o detalle de colaborador) → **"Asignar periférico"**.
2. Seleccionar modelo (`tiene_serie = 0`, `disponible > 0`) + colaborador + cantidad + fecha.
3. Se crea fila en `stock_asignaciones`.
4. El disponible cae en tiempo real.

### 5.4 Devolución de periférico

1. En detalle del colaborador → periférico activo → **"Devolver"**.
2. Se setea `fecha_fin` en `stock_asignaciones`.
3. El stock disponible sube.

---

## 6. Módulos de UI

| Módulo | Estado | Descripción |
|---|---|---|
| **Modelos** | 🆕 Nuevo | CRUD catálogo. Columnas: código, nombre, marca, tipo, tiene_serie, end_of_support. Filtros: tipo, tiene_serie. |
| **Proveedores** | 🆕 Nuevo | CRUD simple. Lista con nombre, RUC, email. |
| **Compras** | 🆕 Nuevo | Lista de documentos. Detalle con líneas y acción "Registrar unidades" para modelos serializados. |
| **Inventario** | 🆕 Nuevo | Dashboard de stock: tabla modelos no-serializados con total/asignado/disponible. Vista de equipos serializados por modelo. |
| **Equipos** | ✏️ Refactor | Formulario en 2 pasos: elegir modelo del catálogo → ingresar datos físicos (serie, ubicación, etc.). Tabla muestra nombre de modelo heredado. |
| **Asignaciones** | ✏️ Actualizar | Tab adicional "Periféricos activos". Modal "Asignar periférico" separado del modal de equipos. |
| **Detalle Colaborador** | ✏️ Actualizar | Tab "Equipos actuales" lista equipos serializados + periféricos por stock como secciones separadas. |
| **Detalle Equipo** | ✏️ Actualizar | Tab "General" muestra campos de `modelos` + campos físicos de `equipos`. Link a compra de origen. |

---

## 7. Backend — módulos NestJS nuevos

```
src/modules/
  modelos/         — ModelosModule (entity, service, controller, dto)
  proveedores/     — ProveedoresModule
  compras/         — ComprasModule (compras + compras_detalle)
  inventario/      — InventarioModule (queries de stock, dashboard)
  stock-asignaciones/ — StockAsignacionesModule
```

Los módulos `equipos` y `asignaciones` se actualizan para acomodar las nuevas relaciones.

---

## 8. Orden de implementación

| Paso | Qué | Dependencias |
|---|---|---|
| 1 | DDL: crear `modelos`, `proveedores` | — |
| 2 | DDL: crear `compras`, `compras_detalle` | modelos, proveedores |
| 3 | DDL: refactor `equipos` (agregar modelo_id, quitar cols redundantes) | modelos |
| 4 | DDL: crear `stock_asignaciones` | modelos, colaboradores |
| 5 | Backend: ModelosModule + ProveedoresModule | paso 1 |
| 6 | Backend: ComprasModule (con lógica de alta de unidades) | pasos 2–3, 5 |
| 7 | Backend: StockAsignacionesModule | paso 4 |
| 8 | Backend: InventarioModule (queries de stock) | pasos 6–7 |
| 9 | Backend: actualizar EquiposModule y AsignacionesModule | pasos 3–4 |
| 10 | Frontend: Modelos + Proveedores (CRUD) | paso 5 |
| 11 | Frontend: Compras + alta de unidades | paso 6, 10 |
| 12 | Frontend: Inventario dashboard | paso 8 |
| 13 | Frontend: refactor Equipos (formulario 2 pasos) | paso 9, 10 |
| 14 | Frontend: Asignaciones periféricos | paso 7, 12 |
| 15 | Frontend: actualizar detalle Colaborador y Equipo | pasos 13–14 |

---

## 9. Consideraciones técnicas

- **TypeORM entities:** cada nueva tabla tiene su propio entity. Las relaciones usan `@ManyToOne` / `@OneToMany` con `eager: false` por defecto (cargar explícitamente en queries que lo necesiten para evitar N+1).
- **Migrations:** TypeORM migrations numeradas, reversibles.
- **Permisos:** ADMIN y TECNICO pueden registrar compras y dar de alta unidades. GERENTE puede ver. VISUALIZADOR solo lectura.
- **Validación de stock:** al crear `stock_asignaciones`, el servicio verifica que `disponible >= cantidad` antes de insertar. Lanza `BadRequestException` si no hay stock suficiente.
- **Unicidad de serie:** el constraint UNIQUE en `equipos.serie` se mantiene. El servicio devuelve error claro si se intenta ingresar una serie duplicada.
