import { Test, TestingModule } from '@nestjs/testing';
import { EquiposService } from './equipos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Equipo } from './entities/equipo.entity';
import { NotFoundException } from '@nestjs/common';

const mockEquipo: Partial<Equipo> = {
  id: 1,
  empresa: 'MT INDUSTRIAL',
  nombre: 'CORE1-SOLE',
  tipo: 'SWITCH',
  estado: 'ACTIVO',
};

describe('EquiposService', () => {
  let service: EquiposService;
  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: getRepositoryToken(Equipo), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<EquiposService>(EquiposService);
    jest.clearAllMocks();
  });

  it('findAll debe retornar datos paginados', async () => {
    mockRepo.findAndCount.mockResolvedValue([[mockEquipo], 1]);
    const result = await service.findAll({}, 1, 50);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('findOne debe lanzar NotFoundException si no existe', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('create debe guardar y retornar el equipo', async () => {
    mockRepo.create.mockReturnValue(mockEquipo);
    mockRepo.save.mockResolvedValue(mockEquipo);
    const result = await service.create({ empresa: 'MT INDUSTRIAL', nombre: 'CORE1' } as any, 1);
    expect(result).toEqual(mockEquipo);
  });

  it('remove debe cambiar estado a BAJA', async () => {
    const equipoActivo = { ...mockEquipo, estado: 'ACTIVO' };
    mockRepo.findOne.mockResolvedValue(equipoActivo);
    mockRepo.save.mockResolvedValue({ ...equipoActivo, estado: 'BAJA' });
    await service.remove(1);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ estado: 'BAJA' }));
  });
});
