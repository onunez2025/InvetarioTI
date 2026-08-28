import { Test, TestingModule } from '@nestjs/testing';
import { IntegracionesService } from './integraciones.service';
import { EquiposService } from '../equipos/equipos.service';
import * as XLSX from 'xlsx';

function crearBufferExcel(filas: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('IntegracionesService', () => {
  let service: IntegracionesService;
  const mockEquiposService = {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracionesService,
        { provide: EquiposService, useValue: mockEquiposService },
      ],
    }).compile();
    service = module.get<IntegracionesService>(IntegracionesService);
    jest.clearAllMocks();
  });

  it('debe importar filas válidas y retornar resumen', async () => {
    const buffer = crearBufferExcel([
      { EMPRESA: 'MT INDUSTRIAL', 'NOMBRE DISPOSITIVO': 'CORE1', TIPO: 'SWITCH', SERIE: 'SN001' },
      { EMPRESA: 'MT INDUSTRIAL', 'NOMBRE DISPOSITIVO': 'CORE2', TIPO: 'SERVIDOR', SERIE: 'SN002' },
    ]);
    const result = await service.importarExcel(buffer, 1);
    expect(result.importados).toBe(2);
    expect(result.errores).toBe(0);
    expect(mockEquiposService.create).toHaveBeenCalledTimes(2);
  });

  it('debe contar errores cuando create falla', async () => {
    mockEquiposService.create.mockRejectedValueOnce(new Error('Serie duplicada'));
    const buffer = crearBufferExcel([
      { EMPRESA: 'MT INDUSTRIAL', 'NOMBRE DISPOSITIVO': 'CORE1', SERIE: 'DUPLICADO' },
    ]);
    const result = await service.importarExcel(buffer, 1);
    expect(result.importados).toBe(0);
    expect(result.errores).toBe(1);
    expect(result.detalles[0]).toContain('Serie duplicada');
  });

  it('debe saltar filas sin nombre de dispositivo', async () => {
    const buffer = crearBufferExcel([
      { EMPRESA: 'MT INDUSTRIAL', TIPO: 'SWITCH' }, // sin NOMBRE DISPOSITIVO
      { EMPRESA: 'MT INDUSTRIAL', 'NOMBRE DISPOSITIVO': 'VALID', SERIE: 'SN999' },
    ]);
    const result = await service.importarExcel(buffer, 1);
    expect(result.importados).toBe(1);
    expect(mockEquiposService.create).toHaveBeenCalledTimes(1);
  });
});
