/**
 * Crea las tablas inventario_ti.colaboradores e inventario_ti.asignaciones
 * (solo si no existen)
 */
const sql = require('mssql');
const cfg = {
  server: 'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user: 'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options: { encrypt: true, trustServerCertificate: false },
  requestTimeout: 30000,
};

async function main() {
  const pool = await sql.connect(cfg);
  console.log('✅ Conectado\n');

  // 1. Tabla colaboradores
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'inventario_ti' AND TABLE_NAME = 'colaboradores'
    )
    BEGIN
      CREATE TABLE inventario_ti.colaboradores (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        nombre        NVARCHAR(150)  NOT NULL,
        dni           NVARCHAR(15)   NULL,
        email         NVARCHAR(150)  NULL,
        cargo         NVARCHAR(100)  NULL,
        gerencia      NVARCHAR(100)  NULL,
        departamento  NVARCHAR(100)  NULL,
        activo        BIT            NOT NULL DEFAULT 1,
        creado_en     DATETIME2      NOT NULL DEFAULT GETUTCDATE()
      );
      PRINT 'Tabla colaboradores creada';
    END
    ELSE
      PRINT 'Tabla colaboradores ya existe';
  `);

  // 2. Tabla asignaciones
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'inventario_ti' AND TABLE_NAME = 'asignaciones'
    )
    BEGIN
      CREATE TABLE inventario_ti.asignaciones (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id        INT            NOT NULL REFERENCES inventario_ti.equipos(id),
        colaborador_id   INT            NOT NULL REFERENCES inventario_ti.colaboradores(id),
        fecha_inicio     DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
        fecha_fin        DATE           NULL,           -- NULL = asignación activa
        observaciones    NVARCHAR(500)  NULL,
        creado_por       INT            NULL REFERENCES inventario_ti.usuarios(id),
        creado_en        DATETIME2      NOT NULL DEFAULT GETUTCDATE()
      );
      CREATE INDEX IX_asignaciones_equipo    ON inventario_ti.asignaciones(equipo_id);
      CREATE INDEX IX_asignaciones_colab     ON inventario_ti.asignaciones(colaborador_id);
      CREATE INDEX IX_asignaciones_activa    ON inventario_ti.asignaciones(equipo_id) WHERE fecha_fin IS NULL;
      PRINT 'Tabla asignaciones creada';
    END
    ELSE
      PRINT 'Tabla asignaciones ya existe';
  `);

  // 3. Verificar
  const check = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'inventario_ti'
      AND TABLE_NAME IN ('colaboradores','asignaciones')
    ORDER BY TABLE_NAME
  `);
  console.log('Tablas disponibles:');
  check.recordset.forEach(r => console.log(`  ✅ inventario_ti.${r.TABLE_NAME}`));

  await pool.close();
  console.log('\nListo.');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
