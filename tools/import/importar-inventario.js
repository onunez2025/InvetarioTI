/**
 * Importación masiva: Inventario_General_Equipos_Sole.xlsx → Azure SQL
 * Hojas: TELECOMUNICACIONES, INFRAESTRUCTURA, IMPRESORAS, PDA, MICROINFORMATICA, UPS
 */
const XLSX = require('xlsx');
const sql  = require('mssql');

/* ---- DB config ---- */
const dbConfig = {
  server:   'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user:     'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options:  { encrypt: true, trustServerCertificate: false },
  requestTimeout: 30000,
};

/* ---- Sheets a importar ---- */
const HOJAS_EQUIPO = ['TELECOMUNICACIONES', 'INFRAESTRUCTURA', 'IMPRESORAS', 'PDA', 'MICROINFORMATICA', 'UPS'];

/* ---- Normalización de tipos ---- */
const TIPO_MAP = {
  'SWICH':            'SWITCH',
  'SWITCH':           'SWITCH',
  'SWITCH ADMINISTRABLE': 'SWITCH',
  'EPSON':            'IMPRESORA',
  'CANON':            'IMPRESORA',
  'BROTHER':          'IMPRESORA',
  'KOLFF':            'IMPRESORA',
  'TSC':              'IMPRESORA',
  'AVERY DENNISON':   'IMPRESORA',
  'HP':               'IMPRESORA',
  'ZEBRA':            'HANDHELD',
  'SERVER':           'SERVIDOR',
  'SERVIDOR':         'SERVIDOR',
  'STORAGE':          'SERVIDOR',
  'NVISION':          'NVR',
  'VIDEOCONFERENCIA': 'VIDEOCONFERENCIA',
};

function normalizarTipo(tipo, hojaName) {
  if (!tipo) return hojaName === 'IMPRESORAS' ? 'IMPRESORA' : null;
  const up = String(tipo).toUpperCase().trim();
  return TIPO_MAP[up] ?? tipo;
}

/* ---- Conversión de fecha serial Excel → YYYY-MM-DD ---- */
function parsearFecha(valor) {
  if (!valor) return null;
  if (typeof valor === 'number') {
    // Excel epoch starts 1900-01-01 (with leap year bug)
    const date = XLSX.SSF.parse_date_code(valor);
    if (date) {
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${date.y}-${m}-${d}`;
    }
  }
  const d = new Date(String(valor));
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

/* ---- Leer y limpiar datos del Excel ---- */
function leerEquipos(excelPath) {
  const wb      = XLSX.readFile(excelPath);
  const equipos = [];
  const series  = new Set();
  let saltados  = 0;

  HOJAS_EQUIPO.forEach(hojaName => {
    const ws = wb.Sheets[hojaName];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const dataRows = rows.slice(1); // skip header row

    dataRows.forEach(r => {
      if (!r || !r[1]) return; // skip empty rows

      const nombre = String(r[1]).trim();
      if (!nombre) return;

      const serie = r[10] ? String(r[10]).trim() : null;

      // Skip duplicate series
      if (serie && series.has(serie)) {
        saltados++;
        return;
      }
      if (serie) series.add(serie);

      equipos.push({
        empresa:      String(r[0] || 'MT INDUSTRIAL').trim(),
        nombre,
        gerencia:     r[2]  ? String(r[2]).trim()  : null,
        departamento: r[3]  ? String(r[3]).trim()  : null,
        codigo:       r[4]  ? String(r[4]).trim()  : null,
        ceco:         r[5]  ? String(r[5]).trim()  : null,
        ubicacion:    r[6]  ? String(r[6]).trim()  : null,
        tipo:         normalizarTipo(r[7], hojaName),
        marca:        r[8]  ? String(r[8]).trim()  : null,
        modelo:       r[9]  ? String(r[9]).trim()  : null,
        serie:        serie || null,
        firmware:     r[11] ? String(r[11]).trim() : null,
        version:      r[12] ? String(r[12]).trim() : null,
        endOfSale:    parsearFecha(r[13]),
        endOfSupport: parsearFecha(r[14]),
      });
    });
  });

  console.log(`\n📂 Equipos leídos: ${equipos.length} (${saltados} duplicados de serie omitidos)\n`);
  return equipos;
}

/* ---- Obtener ID del admin para creado_por ---- */
async function obtenerAdminId(pool) {
  const res = await pool.request()
    .query(`SELECT TOP 1 id FROM inventario_ti.usuarios WHERE rol = 'ADMIN' ORDER BY id`);
  if (!res.recordset.length) throw new Error('No hay usuario ADMIN en la base de datos');
  return res.recordset[0].id;
}

/* ---- Insert con manejo de errores ---- */
async function insertarEquipo(pool, eq, adminId) {
  const req = pool.request();
  req.input('empresa',      sql.NVarChar(100),  eq.empresa);
  req.input('nombre',       sql.NVarChar(150),  eq.nombre);
  req.input('gerencia',     sql.NVarChar(100),  eq.gerencia);
  req.input('departamento', sql.NVarChar(100),  eq.departamento);
  req.input('codigo',       sql.NVarChar(50),   eq.codigo);
  req.input('ceco',         sql.NVarChar(100),  eq.ceco);
  req.input('ubicacion',    sql.NVarChar(150),  eq.ubicacion);
  req.input('tipo',         sql.NVarChar(50),   eq.tipo);
  req.input('marca',        sql.NVarChar(100),  eq.marca);
  req.input('modelo',       sql.NVarChar(150),  eq.modelo);
  req.input('serie',        sql.NVarChar(100),  eq.serie);
  req.input('firmware',     sql.NVarChar(100),  eq.firmware);
  req.input('version',      sql.NVarChar(50),   eq.version);
  req.input('endOfSale',    sql.Date,           eq.endOfSale ? new Date(eq.endOfSale) : null);
  req.input('endOfSupport', sql.Date,           eq.endOfSupport ? new Date(eq.endOfSupport) : null);
  req.input('adminId',      sql.Int,            adminId);

  await req.query(`
    INSERT INTO inventario_ti.equipos
      (empresa, nombre, gerencia, departamento, codigo, ceco, ubicacion,
       tipo, marca, modelo, serie, firmware, version,
       end_of_sale, end_of_support, estado, creado_por, creado_en, actualizado_en)
    VALUES
      (@empresa, @nombre, @gerencia, @departamento, @codigo, @ceco, @ubicacion,
       @tipo, @marca, @modelo, @serie, @firmware, @version,
       @endOfSale, @endOfSupport, 'ACTIVO', @adminId, GETDATE(), GETDATE())
  `);
}

/* ---- MAIN ---- */
async function main() {
  const EXCEL_PATH = 'C:\\Users\\onunez\\Downloads\\Inventario_General_Equipos_Sole.xlsx';

  console.log('═══════════════════════════════════════════════════');
  console.log('  Importación masiva — InventarioTI');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Leer Excel
  const equipos = leerEquipos(EXCEL_PATH);

  // 2. Conectar a Azure SQL
  console.log('🔌 Conectando a Azure SQL...');
  const pool = await sql.connect(dbConfig);
  console.log('✅ Conectado\n');

  // 3. Obtener admin ID
  const adminId = await obtenerAdminId(pool);
  console.log(`👤 Admin ID: ${adminId}\n`);

  // 4. Verificar cuántos ya existen
  const existentes = await pool.request()
    .query(`SELECT COUNT(*) AS total FROM inventario_ti.equipos`);
  console.log(`📊 Equipos existentes en DB: ${existentes.recordset[0].total}`);
  console.log(`📦 Equipos a insertar: ${equipos.length}\n`);

  // 5. Insertar en lotes con progreso
  let insertados = 0;
  let errores    = 0;
  const errLog   = [];

  console.log('⏳ Importando...');
  const inicio = Date.now();

  for (let i = 0; i < equipos.length; i++) {
    const eq = equipos[i];
    try {
      await insertarEquipo(pool, eq, adminId);
      insertados++;
    } catch (err) {
      errores++;
      const msg = `Fila ${i + 1} "${eq.nombre}" (serie:${eq.serie ?? 'N/A'}): ${err.message}`;
      errLog.push(msg);
      // Solo mostrar primeros 5 errores en consola
      if (errores <= 5) console.warn('  ⚠', msg);
    }

    // Progreso cada 100 registros
    if ((i + 1) % 100 === 0 || i === equipos.length - 1) {
      const pct = Math.round(((i + 1) / equipos.length) * 100);
      process.stdout.write(`\r  Progreso: ${i + 1}/${equipos.length} (${pct}%) — OK: ${insertados} | Err: ${errores}   `);
    }
  }

  const segs = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log('\n');

  // 6. Verificar total final
  const final = await pool.request()
    .query(`SELECT COUNT(*) AS total FROM inventario_ti.equipos`);

  // 7. Resumen
  console.log('═══════════════════════════════════════════════════');
  console.log('  RESULTADO FINAL');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Insertados:  ${insertados}`);
  console.log(`⚠  Errores:     ${errores}`);
  console.log(`⏱  Tiempo:      ${segs}s`);
  console.log(`📊 Total en DB: ${final.recordset[0].total} equipos`);

  if (errLog.length > 0) {
    console.log(`\n⚠  Primeros errores (${Math.min(errLog.length, 10)} de ${errLog.length}):`);
    errLog.slice(0, 10).forEach(e => console.log('  •', e));
  }

  await pool.close();
  console.log('\n🎉 Importación completada.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ ERROR FATAL:', err.message);
  process.exit(1);
});
