/**
 * Pobla la descripción (extra) de las gerencias en inventario_ti.catalogos
 * usando la tabla CUPONERA.TB_AREA que tiene el mapeo código → nombre largo
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

  // 1. Ver cuántas filas tiene TB_AREA
  const totalArea = await pool.request().query(`
    SELECT COUNT(*) AS total, COUNT(CASE WHEN VC_Estado = 'A' THEN 1 END) AS activos
    FROM CUPONERA.TB_AREA
  `);
  console.log(`TB_AREA: ${totalArea.recordset[0].total} filas, ${totalArea.recordset[0].activos} activos\n`);

  // 2. Mostrar muestra completa
  const muestra = await pool.request().query(`
    SELECT VC_Codigo, VC_Nombre, VC_Estado FROM CUPONERA.TB_AREA ORDER BY VC_Codigo
  `);
  console.log('Códigos disponibles:');
  for (const r of muestra.recordset) {
    console.log(`  ${r.VC_Codigo.padEnd(10)} → ${r.VC_Nombre}`);
  }

  // 3. Actualizar el campo extra de gerencias
  const update = await pool.request().query(`
    UPDATE g
    SET g.extra = LTRIM(RTRIM(a.VC_Nombre))
    FROM inventario_ti.catalogos g
    INNER JOIN CUPONERA.TB_AREA a ON UPPER(LTRIM(RTRIM(a.VC_Codigo))) = g.nombre
    WHERE g.tipo = 'gerencia'
      AND (g.extra IS NULL OR g.extra = '')

    SELECT @@ROWCOUNT AS actualizados
  `);
  const upd = update.recordset[0].actualizados;
  console.log(`\n✅ Gerencias con descripción actualizada: ${upd}`);

  // 4. Ver cuántas quedaron sin descripción
  const sinDesc = await pool.request().query(`
    SELECT nombre FROM inventario_ti.catalogos
    WHERE tipo = 'gerencia' AND (extra IS NULL OR extra = '')
    ORDER BY nombre
  `);
  console.log(`\nGerencias SIN descripción aún: ${sinDesc.recordset.length}`);
  if (sinDesc.recordset.length > 0 && sinDesc.recordset.length <= 30) {
    for (const r of sinDesc.recordset) console.log(`  - ${r.nombre}`);
  } else if (sinDesc.recordset.length > 30) {
    sinDesc.recordset.slice(0, 10).forEach(r => console.log(`  - ${r.nombre}`));
    console.log(`  ... y ${sinDesc.recordset.length - 10} más`);
  }

  // 5. Resumen final
  const resumen = await pool.request().query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN extra IS NOT NULL AND extra <> '' THEN 1 ELSE 0 END) AS con_desc,
      SUM(CASE WHEN extra IS NULL OR extra = '' THEN 1 ELSE 0 END) AS sin_desc
    FROM inventario_ti.catalogos WHERE tipo = 'gerencia'
  `);
  const r = resumen.recordset[0];
  console.log(`\nResumen gerencias: ${r.total} total | ${r.con_desc} con descripción | ${r.sin_desc} sin descripción`);

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
