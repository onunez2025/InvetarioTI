/**
 * Importa empleados desde CUPONERA.TB_EMPLEADO a inventario_ti.colaboradores
 * Solo importa estado Activo (VC_Estado = 'A') y evita duplicados por DNI
 *
 * Mapeo:
 *   nombre     <- TB_EMPLEADO.VC_Nombre
 *   dni        <- TB_EMPLEADO.VC_Usuario  (es el DNI)
 *   email      <- TB_EMPLEADO.VC_Correo
 *   cargo      <- TB_PUESTO.VC_Nombre
 *   gerencia   <- TB_AREA.VC_Codigo  (código corto: GAC, GAF, etc.)
 *   departamento <- NULL (no existe en fuente)
 *   activo     <- 1 (solo importamos activos)
 */
const sql = require('mssql');
const cfg = {
  server: 'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user: 'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options: { encrypt: true, trustServerCertificate: false },
  requestTimeout: 60000,
};

async function main() {
  const pool = await sql.connect(cfg);
  console.log('Conectado.\n');

  // 1. Estadísticas fuente
  const stats = await pool.request().query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN VC_Estado = 'A' THEN 1 ELSE 0 END) AS activos,
      SUM(CASE WHEN VC_Estado = 'I' THEN 1 ELSE 0 END) AS inactivos
    FROM CUPONERA.TB_EMPLEADO
    WHERE VC_Codigo != '0000000*'  -- excluir usuario sistema
  `);
  console.log('Fuente TB_EMPLEADO (sin usuario sistema):');
  console.log(stats.recordset[0]);

  // 2. Ver cuántos ya existen en colaboradores (por DNI)
  const existentes = await pool.request().query(`
    SELECT COUNT(*) AS total FROM inventario_ti.colaboradores
  `);
  console.log('\nColaboradores ya en inventario_ti.colaboradores:', existentes.recordset[0].total);

  // 3. Preguntar modo: SOLO activos o TODOS
  const SOLO_ACTIVOS = true; // Cambiar a false para importar todos
  console.log(`\nModo: importar ${SOLO_ACTIVOS ? 'SOLO ACTIVOS' : 'TODOS (activos + inactivos)'}`);

  // 4. Extraer datos de CUPONERA con JOIN
  const empleados = await pool.request().query(`
    SELECT
      e.VC_Nombre      AS nombre,
      e.VC_Usuario     AS dni,
      e.VC_Correo      AS email,
      p.VC_Nombre      AS cargo,
      a.VC_Codigo      AS gerencia,
      e.VC_Estado      AS estado
    FROM CUPONERA.TB_EMPLEADO e
    LEFT JOIN CUPONERA.TB_PUESTO p ON p.VC_Codigo = e.VC_CodigoPuesto
    LEFT JOIN CUPONERA.TB_AREA   a ON a.VC_Codigo = e.VC_CodigoArea
    WHERE e.VC_Codigo != '0000000*'
    ${SOLO_ACTIVOS ? "AND e.VC_Estado = 'A'" : ''}
    ORDER BY e.VC_Nombre
  `);

  console.log(`\nRegistros a importar: ${empleados.recordset.length}`);

  // 5. Insertar con MERGE (upsert por DNI para evitar duplicados)
  let insertados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const emp of empleados.recordset) {
    try {
      const r = await pool.request()
        .input('nombre', sql.NVarChar(150), (emp.nombre || '').slice(0, 150))
        .input('dni',    sql.NVarChar(15),  (emp.dni    || '').slice(0, 15))
        .input('email',  sql.NVarChar(150), (emp.email  || '').slice(0, 150))
        .input('cargo',  sql.NVarChar(100), (emp.cargo  || '').slice(0, 100))
        .input('gerencia', sql.NVarChar(100), (emp.gerencia || '').slice(0, 100))
        .input('activo', sql.Bit, emp.estado === 'A' ? 1 : 0)
        .query(`
          MERGE inventario_ti.colaboradores AS tgt
          USING (SELECT @dni AS dni) AS src ON tgt.dni = src.dni
          WHEN MATCHED THEN
            UPDATE SET
              nombre    = @nombre,
              email     = @email,
              cargo     = @cargo,
              gerencia  = @gerencia,
              activo    = @activo
          WHEN NOT MATCHED THEN
            INSERT (nombre, dni, email, cargo, gerencia, activo)
            VALUES (@nombre, @dni, @email, @cargo, @gerencia, @activo)
          OUTPUT $action AS accion;
        `);
      const accion = r.recordset[0]?.accion;
      if (accion === 'INSERT') insertados++;
      else if (accion === 'UPDATE') actualizados++;
    } catch (err) {
      errores++;
      if (errores <= 5) console.error(`Error con ${emp.nombre}:`, err.message);
    }
  }

  console.log(`\n✅ Importación completada:`);
  console.log(`   Insertados:   ${insertados}`);
  console.log(`   Actualizados: ${actualizados}`);
  console.log(`   Errores:      ${errores}`);

  // 6. Total final
  const final = await pool.request().query(`
    SELECT COUNT(*) AS total FROM inventario_ti.colaboradores
  `);
  console.log(`   Total en BD:  ${final.recordset[0].total}`);

  await pool.close();
}

main().catch(e => { console.error(e); process.exit(1); });
