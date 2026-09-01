/**
 * Elimina de inventario_ti.catalogos las "gerencias" que son DNIs/códigos de empleado.
 * Las gerencias reales son códigos alfabéticos (GAC, GAF, GG, GMET...).
 * Los DNIs/códigos de empleado empiezan con dígitos (00968474, 07383520, ...).
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

  // 1. Preview: ¿cuántas y cuáles serán eliminadas?
  const preview = await pool.request().query(`
    SELECT nombre, extra
    FROM inventario_ti.catalogos
    WHERE tipo = 'gerencia'
      AND nombre LIKE '[0-9]%'   -- empieza con dígito → es DNI o código de empleado
    ORDER BY nombre
  `);

  console.log(`Serán eliminadas: ${preview.recordset.length} gerencias-DNI`);
  console.log('Primeras 10:');
  preview.recordset.slice(0, 10).forEach(r => console.log(`  - ${r.nombre}`));
  if (preview.recordset.length > 10) {
    console.log(`  ... y ${preview.recordset.length - 10} más`);
  }

  // 2. Las que se CONSERVAN (códigos alfabéticos → gerencias reales)
  const conservar = await pool.request().query(`
    SELECT nombre, extra
    FROM inventario_ti.catalogos
    WHERE tipo = 'gerencia'
      AND nombre NOT LIKE '[0-9]%'
    ORDER BY nombre
  `);
  console.log(`\nSe conservan: ${conservar.recordset.length} gerencias reales:`);
  conservar.recordset.forEach(r => {
    const desc = r.extra ? ` — ${r.extra}` : '';
    console.log(`  ✅ ${r.nombre}${desc}`);
  });

  // 3. Verificar si algún equipo tiene esas gerencias (solo informativo)
  const equiposAfectados = await pool.request().query(`
    SELECT COUNT(*) AS total
    FROM inventario_ti.equipos
    WHERE gerencia LIKE '[0-9]%'
  `);
  console.log(`\nEquipos con gerencia-DNI: ${equiposAfectados.recordset[0].total}`);
  console.log('(El campo gerencia en equipos es texto libre — no se verán afectados)');

  // 4. Desligar departamentos que apuntan a las gerencias-DNI (poner parent_id = NULL)
  console.log('\nDesligando departamentos huérfanos...');
  const desvincular = await pool.request().query(`
    UPDATE inventario_ti.catalogos
    SET parent_id = NULL
    WHERE tipo = 'departamento'
      AND parent_id IN (
        SELECT id FROM inventario_ti.catalogos
        WHERE tipo = 'gerencia' AND nombre LIKE '[0-9]%'
      )

    SELECT @@ROWCOUNT AS desvinculados
  `);
  console.log(`  Departamentos con parent_id limpiado: ${desvincular.recordset[0].desvinculados}`);

  // 5. Eliminar
  console.log('\nEliminando gerencias-DNI...');
  const del = await pool.request().query(`
    DELETE FROM inventario_ti.catalogos
    WHERE tipo = 'gerencia'
      AND nombre LIKE '[0-9]%'

    SELECT @@ROWCOUNT AS eliminadas
  `);
  console.log(`✅ Eliminadas: ${del.recordset[0].eliminadas} gerencias-DNI`);

  // 5. Estado final
  const final = await pool.request().query(`
    SELECT COUNT(*) AS total FROM inventario_ti.catalogos WHERE tipo = 'gerencia'
  `);
  console.log(`\nGerencias restantes en catálogo: ${final.recordset[0].total}`);

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
