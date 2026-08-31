/**
 * Fix: cambia el constraint UNIQUE de serie a un índice filtrado
 * que solo aplica cuando serie IS NOT NULL (permite múltiples NULLs).
 */
const sql = require('mssql');

const cfg = {
  server:   'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user:     'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options:  { encrypt: true, trustServerCertificate: false },
};

async function main() {
  const pool = await sql.connect(cfg);
  console.log('Conectado a Azure SQL\n');

  // 1. Buscar constraint UNIQUE en columna serie
  const res = await pool.request().query(`
    SELECT kc.name AS constraint_name
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    JOIN sys.key_constraints kc ON kc.name = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = 'inventario_ti'
      AND tc.TABLE_NAME   = 'equipos'
      AND tc.CONSTRAINT_TYPE = 'UNIQUE'
      AND kcu.COLUMN_NAME = 'serie'
  `);

  if (res.recordset.length > 0) {
    const cname = res.recordset[0].constraint_name;
    console.log('Eliminando constraint:', cname);
    await pool.request().query(`ALTER TABLE inventario_ti.equipos DROP CONSTRAINT [${cname}]`);
    console.log('✅ Constraint eliminado\n');
  } else {
    console.log('No hay constraint UNIQUE separado — verificando índices...');
    // Try to drop any existing unique index on serie
    try {
      await pool.request().query(`DROP INDEX IF EXISTS IX_equipos_serie_notnull ON inventario_ti.equipos`);
    } catch (_) { /* ignore */ }
  }

  // 2. Crear índice filtrado (UNIQUE solo cuando serie IS NOT NULL)
  await pool.request().query(`
    CREATE UNIQUE INDEX IX_equipos_serie_notnull
    ON inventario_ti.equipos (serie)
    WHERE serie IS NOT NULL
  `);
  console.log('✅ Índice filtrado creado: IX_equipos_serie_notnull');
  console.log('   (único solo cuando serie IS NOT NULL)\n');

  // 3. Estado actual
  const cnt = await pool.request().query(`SELECT COUNT(*) AS n FROM inventario_ti.equipos`);
  console.log('Equipos en DB ahora:', cnt.recordset[0].n);

  await pool.close();
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
