/**
 * Explora todas las tablas de la BD buscando datos de gerencias/áreas/departamentos
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

  // 1. Todas las tablas de todos los schemas
  const tablas = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);
  console.log('=== TODAS LAS TABLAS ===');
  for (const t of tablas.recordset) {
    console.log(`  ${t.TABLE_SCHEMA}.${t.TABLE_NAME} (${t.TABLE_TYPE})`);
  }

  // 2. Columnas que sugieren gerencia/area/departamento en cualquier tabla
  console.log('\n=== COLUMNAS CON "gerencia" O "area" O "departamento" ===');
  const cols = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE LOWER(COLUMN_NAME) LIKE '%gerenci%'
       OR LOWER(COLUMN_NAME) LIKE '%area%'
       OR LOWER(COLUMN_NAME) LIKE '%departamento%'
       OR LOWER(COLUMN_NAME) LIKE '%division%'
       OR LOWER(COLUMN_NAME) LIKE '%sede%'
    ORDER BY TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
  `);
  for (const c of cols.recordset) {
    console.log(`  ${c.TABLE_SCHEMA}.${c.TABLE_NAME}.${c.COLUMN_NAME} (${c.DATA_TYPE})`);
  }

  // 3. Buscar tabla de gerencias específicamente
  console.log('\n=== TABLAS CON NOMBRE PARECIDO A GERENCIA/AREA ===');
  const similar = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE LOWER(TABLE_NAME) LIKE '%gerenci%'
       OR LOWER(TABLE_NAME) LIKE '%area%'
       OR LOWER(TABLE_NAME) LIKE '%departamento%'
       OR LOWER(TABLE_NAME) LIKE '%division%'
       OR LOWER(TABLE_NAME) LIKE '%sector%'
       OR LOWER(TABLE_NAME) LIKE '%organiz%'
  `);
  for (const t of similar.recordset) {
    console.log(`  ${t.TABLE_SCHEMA}.${t.TABLE_NAME}`);
    // Mostrar muestra de datos
    try {
      const sample = await pool.request().query(
        `SELECT TOP 5 * FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`
      );
      console.log('    Muestra:', JSON.stringify(sample.recordset, null, 2).slice(0, 400));
    } catch {}
  }

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
