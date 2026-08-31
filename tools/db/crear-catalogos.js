/**
 * Crea la tabla inventario_ti.catalogos y la puebla con valores
 * DISTINCT extraídos de los campos texto de equipos.
 */
const sql = require('mssql');

const cfg = {
  server:   'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user:     'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options:  { encrypt: true, trustServerCertificate: false },
  requestTimeout: 30000,
};

async function main() {
  const pool = await sql.connect(cfg);
  console.log('✅ Conectado a Azure SQL\n');

  // 1. Crear tabla catalogos
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'inventario_ti' AND TABLE_NAME = 'catalogos'
    )
    BEGIN
      CREATE TABLE inventario_ti.catalogos (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        tipo       NVARCHAR(50)  NOT NULL,
        nombre     NVARCHAR(200) NOT NULL,
        extra      NVARCHAR(200) NULL,
        activo     BIT           NOT NULL DEFAULT 1,
        creado_en  DATETIME2     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_catalogo_tipo_nombre UNIQUE (tipo, nombre)
      )
      PRINT 'Tabla catalogos creada'
    END
    ELSE
      PRINT 'Tabla catalogos ya existe'
  `);
  console.log('✅ Tabla inventario_ti.catalogos lista\n');

  // 2. Definición de qué columna de equipos mapea a qué tipo de catálogo
  const mapeos = [
    { tipo: 'empresa',      columna: 'empresa'      },
    { tipo: 'tipo_equipo',  columna: 'tipo'         },
    { tipo: 'marca',        columna: 'marca'        },
    { tipo: 'ubicacion',    columna: 'ubicacion'    },
    { tipo: 'gerencia',     columna: 'gerencia'     },
    { tipo: 'departamento', columna: 'departamento' },
    { tipo: 'ceco',         columna: 'ceco'         },
  ];

  for (const { tipo, columna } of mapeos) {
    const res = await pool.request().query(`
      SELECT DISTINCT UPPER(LTRIM(RTRIM(${columna}))) AS val
      FROM inventario_ti.equipos
      WHERE ${columna} IS NOT NULL AND LTRIM(RTRIM(${columna})) <> ''
      ORDER BY val
    `);

    let insertados = 0;
    for (const row of res.recordset) {
      try {
        await pool.request()
          .input('tipo',   sql.NVarChar(50),  tipo)
          .input('nombre', sql.NVarChar(200), row.val)
          .query(`
            INSERT INTO inventario_ti.catalogos (tipo, nombre)
            VALUES (@tipo, @nombre)
          `);
        insertados++;
      } catch { /* duplicado, ignorar */ }
    }

    console.log(`  ${tipo.padEnd(14)} → ${res.recordset.length} valores encontrados, ${insertados} insertados`);
  }

  // 3. Total
  const total = await pool.request()
    .query(`SELECT COUNT(*) AS n FROM inventario_ti.catalogos`);

  console.log(`\n📊 Total en catalogos: ${total.recordset[0].n} ítems\n`);
  await pool.close();
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
