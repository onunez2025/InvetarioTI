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

  // Ver laptops — ¿qué tienen en nombre?
  const laptops = await pool.request().query(`
    SELECT TOP 15 id, nombre, marca, modelo, serie, ubicacion, gerencia, departamento
    FROM inventario_ti.equipos
    WHERE tipo = 'LAPTOP'
    ORDER BY id
  `);
  console.log('=== 15 primeros LAPTOPS ===');
  laptops.recordset.forEach(r =>
    console.log(`  ID ${r.id}: nombre="${r.nombre}" | ${r.marca} ${r.modelo} | serie=${r.serie} | ubi=${r.ubicacion}`)
  );

  // Patrón de nombre en laptops: ¿cuántos parecen persona vs device?
  const laptopStats = await pool.request().query(`
    SELECT
      COUNT(*) AS total_laptops,
      -- Nombre parece apellido nombre (dos palabras en mayúsculas con espacios)
      SUM(CASE WHEN nombre LIKE '% %' AND nombre = UPPER(nombre) THEN 1 ELSE 0 END) AS nombre_mayusculas,
      SUM(CASE WHEN nombre NOT LIKE '% %' OR nombre != UPPER(nombre) THEN 1 ELSE 0 END) AS nombre_device
    FROM inventario_ti.equipos
    WHERE tipo = 'LAPTOP'
  `);
  console.log('\n=== Estadísticas LAPTOP nombre ===');
  console.log(laptopStats.recordset[0]);

  // Ver todos los nombres únicos en laptops
  const nombresLaptop = await pool.request().query(`
    SELECT DISTINCT nombre, COUNT(*) AS cantidad
    FROM inventario_ti.equipos
    WHERE tipo = 'LAPTOP'
    GROUP BY nombre
    ORDER BY cantidad DESC
    OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
  `);
  console.log('\n=== Nombres más frecuentes en LAPTOPS ===');
  nombresLaptop.recordset.forEach(r => console.log(`  "${r.nombre}" → ${r.cantidad} laptops`));

  await pool.close();
}
main().catch(e => { console.error(e); process.exit(1); });
