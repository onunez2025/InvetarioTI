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

  // Forzar update de todos los códigos conocidos (incluyendo los que ya tenían descripción)
  const upd = await pool.request().query(`
    UPDATE g
    SET g.extra = LTRIM(RTRIM(a.VC_Nombre))
    FROM inventario_ti.catalogos g
    INNER JOIN CUPONERA.TB_AREA a ON UPPER(LTRIM(RTRIM(a.VC_Codigo))) = g.nombre
    WHERE g.tipo = 'gerencia'
    SELECT @@ROWCOUNT AS actualizados
  `);
  console.log('Actualizadas:', upd.recordset[0].actualizados);

  // Ver resultado final
  const final = await pool.request().query(`
    SELECT nombre, extra FROM inventario_ti.catalogos
    WHERE tipo='gerencia' AND extra IS NOT NULL AND extra <> ''
    ORDER BY nombre
  `);
  console.log('\nGerencias con descripcion:');
  for (const r of final.recordset) {
    console.log(`  ${r.nombre.padEnd(8)} → ${r.extra}`);
  }

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
