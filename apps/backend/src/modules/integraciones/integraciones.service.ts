import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EquiposService } from '../equipos/equipos.service';

const COLUMNAS_PLANTILLA = [
  'EMPRESA', 'NOMBRE DISPOSITIVO', 'TIPO', 'MARCA', 'MODELO',
  'SERIE', 'CODIGO', 'CECO', 'UBICACIÓN', 'GERENCIA', 'DEPARTAMENTO',
  'VERSION', 'FIRMARE', 'END OF SALE', 'END OF SUPPORT',
];

const INSTRUCCIONES_PLANTILLA = [
  ['COLUMNA', 'DESCRIPCIÓN E INSTRUCCIONES'],
  ['EMPRESA', 'Nombre de la empresa. Ej: MT INDUSTRIAL'],
  ['NOMBRE DISPOSITIVO', '⚠️ OBLIGATORIO. Alias del dispositivo. Ej: CORE1-SOLE, HP ProBook 450 G10'],
  ['TIPO', 'LAPTOP · PC · SWITCH · IMPRESORA · CAMERA · ACCESS POINT · HANDHELD · TABLET · SERVIDOR · DVR · NVR · VIDEOCONFERENCIA'],
  ['MARCA', 'Fabricante. Ej: HP · LENOVO · CISCO · AXIS · ZEBRA · EPSON'],
  ['MODELO', 'Modelo exacto. Ej: ProBook 450 G10 · WS-C3650-48TS'],
  ['SERIE', 'Número de serie único por equipo.'],
  ['CODIGO', 'Código de activo interno. Ej: MT080104'],
  ['CECO', 'Centro de costo. Ej: GAC-01'],
  ['UBICACIÓN', 'Ubicación física. Ej: Callao · Showroom Benavides'],
  ['GERENCIA', 'Código de gerencia. Ej: GAC · GAF · GO · GIC · GMET · GP · GV · GVT'],
  ['DEPARTAMENTO', 'Nombre del departamento. Ej: INFRAESTRUCTURA Y TELECOMUNICACIONES'],
  ['VERSION', 'Versión de SO. Ej: Windows 11 Pro · iOS 16'],
  ['FIRMARE', 'Versión de firmware. Ej: 16.12.4 · 10.12.187'],
  ['END OF SALE', 'Fecha fin de venta. Formato: DD/MM/AAAA o AAAA-MM-DD'],
  ['END OF SUPPORT', 'Fecha fin de soporte. Formato: DD/MM/AAAA o AAAA-MM-DD'],
  [],
  ['NOTAS:', ''],
  ['1', 'NOMBRE DISPOSITIVO es obligatorio. Filas sin ese valor se ignoran.'],
  ['2', 'SERIE debe ser único. Si ya existe en la BD, el registro dará error.'],
  ['3', 'Si EMPRESA se deja vacío, se asume "MT INDUSTRIAL" automáticamente.'],
  ['4', 'Los campos vacíos quedan como "sin datos" en el sistema.'],
];

interface FilaExcel {
  EMPRESA?: string;
  'NOMBRE DISPOSITIVO'?: string;
  GERENCIA?: string;
  DEPARTAMENTO?: string;
  CODIGO?: string;
  CECO?: string;
  'UBICACIÓN'?: string;
  TIPO?: string;
  MARCA?: string;
  MODELO?: string;
  SERIE?: string;
  FIRMARE?: string;
  VERSION?: string;
  'END OF SALE'?: string | number;
  'END OF SUPPORT'?: string | number;
}

function parsearFecha(valor: string | number | undefined): string | undefined {
  if (!valor) return undefined;
  // Si es número (fecha serial de Excel)
  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor);
    if (fecha) return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`;
  }
  // Si es string
  const d = new Date(String(valor));
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
}

export interface ResultadoImportacion {
  importados: number;
  errores: number;
  detalles: string[];
}

@Injectable()
export class IntegracionesService {
  private readonly logger = new Logger(IntegracionesService.name);

  constructor(private readonly equiposService: EquiposService) {}

  generarPlantilla(): Buffer {
    const wb = XLSX.utils.book_new();

    // Hoja 1: INVENTARIO (cabecera + 2 filas ejemplo)
    const ejemplos = [
      ['MT INDUSTRIAL', 'HP ProBook 450 G10', 'LAPTOP', 'HP', 'ProBook 450 G10', '5CD3381X9M', 'MT-LAP-001', 'GAC-01', 'Televentas Sole', 'GAC', 'ATENCIÓN AL CLIENTE', 'Windows 11 Pro', '', '31/12/2027', '31/12/2030'],
      ['MT INDUSTRIAL', 'CORE1-SOLE', 'SWITCH', 'Cisco', 'WS-C3650-48TS', 'FDO1840E168', 'MT080104', 'GAF-INFRA', 'Callao', 'GAF', 'INFRAESTRUCTURA Y TELECOMUNICACIONES', '', '16.12.4', '30/06/2025', '31/10/2029'],
    ];
    const wsData = [COLUMNAS_PLANTILLA, ...ejemplos];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [16,32,20,12,22,18,14,12,24,10,32,18,14,14,16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'INVENTARIO');

    // Hoja 2: INSTRUCCIONES
    const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCCIONES_PLANTILLA);
    wsInstr['!cols'] = [{ wch: 22 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCCIONES');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async importarExcel(buffer: Buffer, usuarioId: number): Promise<ResultadoImportacion> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const filas: FilaExcel[] = XLSX.utils.sheet_to_json(hoja, { defval: undefined });

    let importados = 0;
    let errores = 0;
    const detalles: string[] = [];

    for (const fila of filas) {
      const nombre = fila['NOMBRE DISPOSITIVO'];
      if (!nombre) continue; // saltar filas vacías

      try {
        await this.equiposService.create(
          {
            empresa: fila.EMPRESA ?? 'MT INDUSTRIAL',
            nombre,
            gerencia: fila.GERENCIA,
            departamento: fila.DEPARTAMENTO,
            codigo: fila.CODIGO,
            ceco: fila.CECO,
            ubicacion: fila['UBICACIÓN'],
            serie: fila.SERIE,
          },
          usuarioId,
        );
        importados++;
      } catch (error) {
        errores++;
        const msg = `Error en "${nombre}": ${(error as Error).message}`;
        detalles.push(msg);
        this.logger.warn(msg);
      }
    }

    this.logger.log(`Importación finalizada — importados: ${importados}, errores: ${errores}`);
    return { importados, errores, detalles };
  }
}
