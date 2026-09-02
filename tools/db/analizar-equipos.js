/**
 * Analiza la tabla inventario_ti.equipos para entender qué hay en nombre
 * y qué tenemos disponible para construir el nombre real del equipo
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

  // Ver las primeras 10 filas con todos los campos relevantes
  const sample = await pool.request().query(`
    SELECT TOP 10
      id, nombre, tipo, marca, modelo, serie, codigo, ubicacion,
      gerencia, departamento, estado
    FROM inventario_ti.equipos
    ORDER BY id
  `);
  console.log('=== 10 primeros equipos ===');
  console.log(JSON.stringify(sample.recordset, null, 2));

  // Estadísticas de campos rellenos
  const stats = await pool.request().query(`
    SELECT
      COUNT(*)                                               AS total,
      SUM(CASE WHEN tipo        IS NOT NULL THEN 1 ELSE 0 END) AS tiene_tipo,
      SUM(CASE WHEN marca       IS NOT NULL THEN 1 ELSE 0 END) AS tiene_marca,
      SUM(CASE WHEN modelo      IS NOT NULL THEN 1 ELSE 0 END) AS tiene_modelo,
      SUM(CASE WHEN serie       IS NOT NULL THEN 1 ELSE 0 END) AS tiene_serie,
      SUM(CASE WHEN nombre LIKE '%[0-9]%' AND nombre LIKE '% %' THEN 1 ELSE 0 END) AS nombre_parece_persona
    FROM inventario_ti.equipos
  `);
  console.log('\n=== Estadísticas de campos ===');
  console.log(stats.recordset[0]);

  // Tipos de equipo disponibles
  const tipos = await pool.request().query(`
    SELECT tipo, COUNT(*) AS cantidad
    FROM inventario_ti.equipos
    WHERE tipo IS NOT NULL
    GROUP BY tipo
    ORDER BY cantidad DESC
  `);
  console.log('\n=== Tipos de equipo ===');
  tipos.recordset.forEach(r => console.log(`  ${r.tipo}: ${r.cantidad}`));

  // Ver si podemos construir un buen nombre con tipo+marca+modelo
  const nombrePropuesto = await pool.request().query(`
    SELECT TOP 5
      id,
      nombre                                        AS nombre_actual,
      TRIM(CONCAT(
        ISNULL(tipo, ''), ' ',
        ISNULL(marca, ''), ' ',
        ISNULL(modelo, '')
      ))                                            AS nombre_propuesto,
      serie
    FROM inventario_ti.equipos
    WHERE tipo IS NOT NULL OR marca IS NOT NULL
    ORDER BY id
  `);
  console.log('\n=== Nombre propuesto (tipo + marca + modelo) ===');
  nombrePropuesto.recordset.forEach(r => {
    console.log(`  ID ${r.id}: actual="${r.nombre_actual}" → propuesto="${r.nombre_propuesto}" | serie=${r.serie}`);
  });

  await pool.close();
}

main().catch(e => { console.error(e); process.exit(1); });
