/**
 * Explora las tablas de CUPONERA que contienen datos de empleados
 * para ver columnas y datos de muestra
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
  console.log('Conectado.\n');

  const tablas = ['TB_EMPLEADO', 'TB_PUESTO', 'TB_ROL', 'TB_AREA'];

  for (const t of tablas) {
    console.log(`\n========== CUPONERA.${t} ==========`);

    // Columnas
    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'CUPONERA' AND TABLE_NAME = '${t}'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('Columnas:');
    cols.recordset.forEach(c =>
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${c.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`)
    );

    // Conteo
    const cnt = await pool.request().query(`SELECT COUNT(*) AS total FROM CUPONERA.${t}`);
    console.log(`Total filas: ${cnt.recordset[0].total}`);

    // Muestra (3 filas)
    const sample = await pool.request().query(`SELECT TOP 3 * FROM CUPONERA.${t}`);
    console.log('Muestra (3 filas):');
    console.log(JSON.stringify(sample.recordset, null, 2));
  }

  // JOIN propuesto para ver como quedaría el cruce
  console.log('\n========== JOIN EMPLEADO + PUESTO + AREA ==========');
  try {
    const join = await pool.request().query(`
      SELECT TOP 5
        e.*,
        p.DESCRIPCION AS puesto_desc,
        a.DESCRIPCION AS area_desc
      FROM CUPONERA.TB_EMPLEADO e
      LEFT JOIN CUPONERA.TB_PUESTO p ON p.ID_PUESTO = e.ID_PUESTO
      LEFT JOIN CUPONERA.TB_AREA a   ON a.ID_AREA   = e.ID_AREA
    `);
    console.log(JSON.stringify(join.recordset, null, 2));
  } catch (err) {
    console.log('Join falló, ajusta columnas:', err.message);
  }

  await pool.close();
}

main().catch(e => { console.error(e); process.exit(1); });
