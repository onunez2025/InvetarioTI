/**
 * Genera la plantilla Excel para importar equipos a InventarioTI
 * Columnas exactas que espera el backend (integraciones.service.ts)
 */
const XLSX = require('xlsx');
const path = require('path');

// ── Columnas (nombres exactos que lee el backend) ──────────────────────────
const COLUMNAS = [
  'EMPRESA',
  'NOMBRE DISPOSITIVO',
  'TIPO',
  'MARCA',
  'MODELO',
  'SERIE',
  'CODIGO',
  'CECO',
  'UBICACIÓN',
  'GERENCIA',
  'DEPARTAMENTO',
  'VERSION',
  'FIRMARE',         // así está en el backend (typo original)
  'END OF SALE',
  'END OF SUPPORT',
];

// ── Instrucciones por columna ──────────────────────────────────────────────
const INSTRUCCIONES = [
  'Nombre de la empresa. Ej: MT INDUSTRIAL',
  '⚠️ OBLIGATORIO. Nombre/alias del dispositivo. Ej: CORE1-SOLE, HP ProBook 450 G10, Camara Pasillo 3',
  'Tipo de equipo. Valores: LAPTOP · PC · SWITCH · IMPRESORA · CAMERA · ACCESS POINT · HANDHELD · TABLET · SERVIDOR · DVR · NVR · TABLET · VIDEOCONFERENCIA · Otro',
  'Marca/fabricante. Ej: HP · LENOVO · CISCO · AXIS · ZEBRA · EPSON',
  'Modelo exacto. Ej: ProBook 450 G10 · WS-C3650-48TS · P3245-E',
  'Número de serie del dispositivo. Debe ser único por equipo.',
  'Código de activo interno. Ej: MT080104',
  'Centro de costo. Ej: 1001 · GAC-01',
  'Ubicación física. Ej: Callao · Showroom Benavides · Televentas Sole',
  'Código de gerencia. Ej: GAC · GAF · GG · GO · GIC · GMET · GP · GV · GVT',
  'Nombre del departamento. Ej: INFRAESTRUCTURA Y TELECOMUNICACIONES',
  'Versión de SO o firmware. Ej: Windows 11 · iOS 16 · 15.9(3)M3',
  'Versión de firmware (campo adicional)',
  'Fecha fin de venta. Formato: DD/MM/AAAA o AAAA-MM-DD. Ej: 31/12/2025',
  'Fecha fin de soporte. Formato: DD/MM/AAAA o AAAA-MM-DD. Ej: 31/12/2028',
];

// ── Filas de ejemplo ───────────────────────────────────────────────────────
const EJEMPLOS = [
  {
    'EMPRESA': 'MT INDUSTRIAL',
    'NOMBRE DISPOSITIVO': 'HP ProBook 450 G10',
    'TIPO': 'LAPTOP',
    'MARCA': 'HP',
    'MODELO': 'ProBook 450 G10',
    'SERIE': '5CD3381X9M',
    'CODIGO': 'MT-LAP-001',
    'CECO': 'GAC-01',
    'UBICACIÓN': 'Televentas Sole',
    'GERENCIA': 'GAC',
    'DEPARTAMENTO': 'ATENCIÓN AL CLIENTE',
    'VERSION': 'Windows 11 Pro',
    'FIRMARE': '',
    'END OF SALE': '31/12/2027',
    'END OF SUPPORT': '31/12/2030',
  },
  {
    'EMPRESA': 'MT INDUSTRIAL',
    'NOMBRE DISPOSITIVO': 'CORE1-SOLE',
    'TIPO': 'SWITCH',
    'MARCA': 'Cisco',
    'MODELO': 'WS-C3650-48TS',
    'SERIE': 'FDO1840E168',
    'CODIGO': 'MT080104',
    'CECO': 'GAF-INFRA',
    'UBICACIÓN': 'Callao',
    'GERENCIA': 'GAF',
    'DEPARTAMENTO': 'INFRAESTRUCTURA Y TELECOMUNICACIONES',
    'VERSION': '',
    'FIRMARE': '16.12.4',
    'END OF SALE': '30/06/2025',
    'END OF SUPPORT': '31/10/2029',
  },
  {
    'EMPRESA': 'MT INDUSTRIAL',
    'NOMBRE DISPOSITIVO': 'Camara Pasillo 3 - Almacén',
    'TIPO': 'CAMERA',
    'MARCA': 'AXIS',
    'MODELO': 'P3245-E',
    'SERIE': 'ACCC8E123456',
    'CODIGO': 'MT-CAM-003',
    'CECO': '',
    'UBICACIÓN': 'Callao - Almacén',
    'GERENCIA': 'GO',
    'DEPARTAMENTO': '',
    'VERSION': '10.12.187',
    'FIRMARE': '',
    'END OF SALE': '',
    'END OF SUPPORT': '',
  },
];

// ── Construir workbook ─────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// ── Hoja 1: PLANTILLA ──────────────────────────────────────────────────────
const wsData = [COLUMNAS, ...EJEMPLOS.map(e => COLUMNAS.map(c => e[c] ?? ''))];
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Ancho de columnas
ws['!cols'] = [
  { wch: 16 },  // EMPRESA
  { wch: 32 },  // NOMBRE DISPOSITIVO
  { wch: 20 },  // TIPO
  { wch: 12 },  // MARCA
  { wch: 22 },  // MODELO
  { wch: 18 },  // SERIE
  { wch: 14 },  // CODIGO
  { wch: 12 },  // CECO
  { wch: 24 },  // UBICACIÓN
  { wch: 10 },  // GERENCIA
  { wch: 32 },  // DEPARTAMENTO
  { wch: 18 },  // VERSION
  { wch: 14 },  // FIRMARE
  { wch: 14 },  // END OF SALE
  { wch: 16 },  // END OF SUPPORT
];

XLSX.utils.book_append_sheet(wb, ws, 'INVENTARIO');

// ── Hoja 2: INSTRUCCIONES ──────────────────────────────────────────────────
const instrData = [
  ['COLUMNA', 'DESCRIPCIÓN E INSTRUCCIONES'],
  ...COLUMNAS.map((col, i) => [col, INSTRUCCIONES[i]]),
  [],
  ['NOTAS IMPORTANTES:', ''],
  ['1', 'La columna NOMBRE DISPOSITIVO es obligatoria. Las filas sin ese valor se ignoran.'],
  ['2', 'La columna SERIE debe ser única. Si ya existe en la BD, el registro dará error y se contará como "error".'],
  ['3', 'Las fechas END OF SALE / END OF SUPPORT pueden ir en formato DD/MM/AAAA o AAAA-MM-DD.'],
  ['4', 'GERENCIA usa el código corto: GAC, GAF, GG, GO, GIC, GMET, GP, GV, GVT, etc.'],
  ['5', 'Los campos vacíos quedan como "sin datos". Solo NOMBRE DISPOSITIVO es obligatorio.'],
  ['6', 'Para EMPRESA, si se deja vacío se asume "MT INDUSTRIAL" automáticamente.'],
];

const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
wsInstr['!cols'] = [{ wch: 22 }, { wch: 90 }];
XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCCIONES');

// ── Guardar archivo ────────────────────────────────────────────────────────
const outputPath = path.join(__dirname, '..', '..', 'Plantilla_Inventario_Equipos.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`✅ Plantilla generada: ${outputPath}`);
console.log('\nColumnas incluidas:');
COLUMNAS.forEach((c, i) => console.log(`  ${i+1}. ${c}`));
console.log('\n3 filas de ejemplo incluidas (LAPTOP, SWITCH, CAMERA).');
