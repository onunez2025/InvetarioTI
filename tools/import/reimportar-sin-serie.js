/**
 * Re-importa los equipos sin número de serie que fallaron en la primera pasada
 * (ahora el constraint permite múltiples NULLs en serie).
 */
const XLSX = require('xlsx');
const sql  = require('mssql');

const dbConfig = {
  server:   'soledbserver.database.windows.net',
  database: 'soledb-puntoventa',
  user:     'soledbserveradmin',
  password: '@s0le@dm1nAI#82,',
  options:  { encrypt: true, trustServerCertificate: false },
  requestTimeout: 30000,
};

const HOJAS_EQUIPO = ['TELECOMUNICACIONES','INFRAESTRUCTURA','IMPRESORAS','PDA','MICROINFORMATICA','UPS'];

const TIPO_MAP = {
  'SWICH': 'SWITCH', 'SWITCH': 'SWITCH',
  'EPSON': 'IMPRESORA', 'CANON': 'IMPRESORA', 'BROTHER': 'IMPRESORA',
  'KOLFF': 'IMPRESORA', 'TSC': 'IMPRESORA', 'AVERY DENNISON': 'IMPRESORA', 'HP': 'IMPRESORA',
  'ZEBRA': 'HANDHELD', 'SERVER': 'SERVIDOR', 'STORAGE': 'SERVIDOR',
};

function normalizarTipo(tipo, hojaName) {
  if (!tipo) return hojaName === 'IMPRESORAS' ? 'IMPRESORA' : null;
  const up = String(tipo).toUpperCase().trim();
  return TIPO_MAP[up] ?? tipo;
}

function parsearFecha(valor) {
  if (!valor) return null;
  if (typeof valor === 'number') {
    const date = XLSX.SSF.parse_date_code(valor);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  const d = new Date(String(valor));
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
}

async function main() {
  const EXCEL_PATH = 'C:\\Users\\onunez\\Downloads\\Inventario_General_Equipos_Sole.xlsx';
  const wb = XLSX.readFile(EXCEL_PATH);

  // Recopilar SOLO los equipos sin serie (los que fallaron antes)
  const sinSerie = [];
  const seriesUsadas = new Set(); // para saltar dups entre hojas

  HOJAS_EQUIPO.forEach(hojaName => {
    const ws = wb.Sheets[hojaName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    rows.slice(1).forEach(r => {
      if (!r || !r[1]) return;
      const serie = r[10] ? String(r[10]).trim() : null;
      if (serie) return; // ya se insertó, skip

      const key = `${String(r[1]).trim()}|${String(r[8]||'').trim()}|${String(r[9]||'').trim()}`;
      if (seriesUsadas.has(key)) return;
      seriesUsadas.add(key);

      sinSerie.push({
        empresa:      String(r[0] || 'MT INDUSTRIAL').trim(),
        nombre:       String(r[1]).trim(),
        gerencia:     r[2]  ? String(r[2]).trim()  : null,
        departamento: r[3]  ? String(r[3]).trim()  : null,
        codigo:       r[4]  ? String(r[4]).trim()  : null,
        ceco:         r[5]  ? String(r[5]).trim()  : null,
        ubicacion:    r[6]  ? String(r[6]).trim()  : null,
        tipo:         normalizarTipo(r[7], hojaName),
        marca:        r[8]  ? String(r[8]).trim()  : null,
        modelo:       r[9]  ? String(r[9]).trim()  : null,
        serie:        null,
        firmware:     r[11] ? String(r[11]).trim() : null,
        version:      r[12] ? String(r[12]).trim() : null,
        endOfSale:    parsearFecha(r[13]),
        endOfSupport: parsearFecha(r[14]),
      });
    });
  });

  console.log(`Equipos sin serie a insertar: ${sinSerie.length}\n`);

  const pool = await sql.connect(dbConfig);
  const adminRes = await pool.request()
    .query(`SELECT TOP 1 id FROM inventario_ti.usuarios WHERE rol='ADMIN' ORDER BY id`);
  const adminId = adminRes.recordset[0].id;

  let ok = 0, err = 0;

  for (const eq of sinSerie) {
    try {
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
      req.input('firmware',     sql.NVarChar(100),  eq.firmware);
      req.input('version',      sql.NVarChar(50),   eq.version);
      req.input('endOfSale',    sql.Date,           eq.endOfSale    ? new Date(eq.endOfSale)    : null);
      req.input('endOfSupport', sql.Date,           eq.endOfSupport ? new Date(eq.endOfSupport) : null);
      req.input('adminId',      sql.Int,            adminId);

      await req.query(`
        INSERT INTO inventario_ti.equipos
          (empresa,nombre,gerencia,departamento,codigo,ceco,ubicacion,
           tipo,marca,modelo,serie,firmware,version,
           end_of_sale,end_of_support,estado,creado_por,creado_en,actualizado_en)
        VALUES
          (@empresa,@nombre,@gerencia,@departamento,@codigo,@ceco,@ubicacion,
           @tipo,@marca,@modelo,NULL,@firmware,@version,
           @endOfSale,@endOfSupport,'ACTIVO',@adminId,GETDATE(),GETDATE())
      `);
      ok++;
    } catch(e) {
      err++;
      console.warn('  ⚠', eq.nombre, '-', e.message.slice(0,80));
    }
  }

  const total = await pool.request()
    .query(`SELECT COUNT(*) AS n FROM inventario_ti.equipos`);

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Insertados:', ok);
  console.log('⚠  Errores:  ', err);
  console.log('📊 TOTAL DB: ', total.recordset[0].n, 'equipos');
  console.log('═══════════════════════════════════════\n');

  await pool.close();
  process.exit(0);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
