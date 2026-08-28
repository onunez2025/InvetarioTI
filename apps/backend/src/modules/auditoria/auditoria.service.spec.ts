import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistorialCambio } from './entities/historial-cambio.entity';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  const mockRepo = { save: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: getRepositoryToken(HistorialCambio), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<AuditoriaService>(AuditoriaService);
    jest.clearAllMocks();
  });

  it('debe registrar cambios entre dos versiones de un equipo', async () => {
    mockRepo.save.mockResolvedValue([{}]);
    const anterior = { nombre: 'CORE1', estado: 'ACTIVO' } as any;
    const nuevo = { nombre: 'CORE1-SOLE', estado: 'ACTIVO' } as any;
    await service.registrarCambios(1, anterior, nuevo, 1);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const savedItems = mockRepo.save.mock.calls[0][0];
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].campo).toBe('nombre');
  });

  it('no debe registrar nada si no hay cambios', async () => {
    const mismo = { nombre: 'CORE1', estado: 'ACTIVO' } as any;
    await service.registrarCambios(1, mismo, mismo, 1);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('findByEquipo debe retornar historial ordenado por fecha DESC', async () => {
    const mockHistorial = [{ id: 1, campo: 'nombre' }];
    mockRepo.find.mockResolvedValue(mockHistorial);
    const result = await service.findByEquipo(1);
    expect(result).toEqual(mockHistorial);
    expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { equipo: { id: 1 } },
    }));
  });
});
