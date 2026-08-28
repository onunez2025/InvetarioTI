import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { EquiposService } from '../equipos/equipos.service';

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
            tipo: fila.TIPO,
            marca: fila.MARCA,
            modelo: fila.MODELO,
            serie: fila.SERIE,
            firmware: fila.FIRMARE,
            version: fila.VERSION,
            endOfSale: parsearFecha(fila['END OF SALE']),
            endOfSupport: parsearFecha(fila['END OF SUPPORT']),
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
