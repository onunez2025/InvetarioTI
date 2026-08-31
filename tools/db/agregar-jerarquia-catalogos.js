/**
 * 1. Agrega columna parent_id a inventario_ti.catalogos
 * 2. Puebla las relaciones:
 *    - departamento.parent_id → gerencia más frecuente en equipos
 *    - ubicacion.parent_id   → departamento más frecuente en equipos
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
  console.log('✅ Conectado\n');

  // 1. Agregar columna parent_id si no existe
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA='inventario_ti' AND TABLE_NAME='catalogos' AND COLUMN_NAME='parent_id'
    )
    BEGIN
      ALTER TABLE inventario_ti.catalogos
        ADD parent_id INT NULL
          CONSTRAINT FK_catalogos_parent FOREIGN KEY REFERENCES inventario_ti.catalogos(id)
      PRINT 'Columna parent_id agregada'
    END
    ELSE
      PRINT 'Columna parent_id ya existe'
  `);
  console.log('✅ Columna parent_id lista\n');

  // 2. Poblar departamento → gerencia (la más frecuente en equipos)
  const deptoResult = await pool.request().query(`
    UPDATE c
    SET c.parent_id = sub.gerencia_id
    FROM inventario_ti.catalogos c
    INNER JOIN (
      SELECT
        dep_list.dep AS depto_nombre,
        TOP_G.gerencia_id
      FROM (
        SELECT DISTINCT UPPER(LTRIM(RTRIM(departamento))) AS dep
        FROM inventario_ti.equipos
        WHERE departamento IS NOT NULL AND LTRIM(RTRIM(departamento)) <> ''
      ) dep_list
      CROSS APPLY (
        SELECT TOP 1 g.id AS gerencia_id
        FROM inventario_ti.equipos eq1
        INNER JOIN inventario_ti.catalogos g
          ON UPPER(LTRIM(RTRIM(eq1.gerencia))) = g.nombre AND g.tipo = 'gerencia'
        WHERE UPPER(LTRIM(RTRIM(eq1.departamento))) = dep_list.dep
          AND eq1.gerencia IS NOT NULL
          AND LTRIM(RTRIM(eq1.gerencia)) <> ''
        GROUP BY g.id
        ORDER BY COUNT(*) DESC
      ) TOP_G
    ) sub ON c.nombre = sub.depto_nombre AND c.tipo = 'departamento'
    WHERE c.parent_id IS NULL

    SELECT @@ROWCOUNT AS actualizados
  `);
  const deptoActualizados = deptoResult.recordset[0].actualizados;
  console.log(`✅ departamentos con gerencia asignada: ${deptoActualizados}`);

  // 3. Poblar ubicacion → departamento (el más frecuente en equipos)
  const ubicResult = await pool.request().query(`
    UPDATE c
    SET c.parent_id = sub.depto_id
    FROM inventario_ti.catalogos c
    INNER JOIN (
      SELECT
        ubic_list.ubic AS ubic_nombre,
        TOP_D.depto_id
      FROM (
        SELECT DISTINCT UPPER(LTRIM(RTRIM(ubicacion))) AS ubic
        FROM inventario_ti.equipos
        WHERE ubicacion IS NOT NULL AND LTRIM(RTRIM(ubicacion)) <> ''
      ) ubic_list
      CROSS APPLY (
        SELECT TOP 1 d.id AS depto_id
        FROM inventario_ti.equipos eq2
        INNER JOIN inventario_ti.catalogos d
          ON UPPER(LTRIM(RTRIM(eq2.departamento))) = d.nombre AND d.tipo = 'departamento'
        WHERE UPPER(LTRIM(RTRIM(eq2.ubicacion))) = ubic_list.ubic
          AND eq2.departamento IS NOT NULL
          AND LTRIM(RTRIM(eq2.departamento)) <> ''
        GROUP BY d.id
        ORDER BY COUNT(*) DESC
      ) TOP_D
    ) sub ON c.nombre = sub.ubic_nombre AND c.tipo = 'ubicacion'
    WHERE c.parent_id IS NULL

    SELECT @@ROWCOUNT AS actualizados
  `);
  const ubicActualizados = ubicResult.recordset[0].actualizados;
  console.log(`✅ ubicaciones con departamento asignado: ${ubicActualizados}\n`);

  // Resumen
  const stats = await pool.request().query(`
    SELECT tipo, COUNT(*) AS total, SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) AS con_padre
    FROM inventario_ti.catalogos
    WHERE tipo IN ('gerencia','departamento','ubicacion')
    GROUP BY tipo ORDER BY tipo
  `);
  console.log('Tipo          | Total | Con padre');
  console.log('--------------|-------|----------');
  for (const r of stats.recordset) {
    console.log(`${r.tipo.padEnd(14)}| ${String(r.total).padEnd(6)}| ${r.con_padre}`);
  }

  await pool.close();
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
