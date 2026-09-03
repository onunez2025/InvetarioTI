import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AsignacionesService } from './asignaciones.service';
import { Asignacion } from './entities/asignacion.entity';

describe('AsignacionesService', () => {
  let service: AsignacionesService;
  let mockDs: { query: jest.Mock };

  beforeEach(async () => {
    mockDs = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionesService,
        {
          provide: getRepositoryToken(Asignacion),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDs,
        },
      ],
    }).compile();

    service = module.get<AsignacionesService>(AsignacionesService);
  });

  it('generarActa retorna Buffer no vacío', async () => {
    mockDs.query
      .mockResolvedValueOnce([
        {
          nombre: 'Juan',
          apellido: 'Pérez',
          cargo: 'Analista',
          gerencia: 'GAC',
          departamento: 'IT',
        },
      ])
      .mockResolvedValueOnce([]) // equipos vacíos
      .mockResolvedValueOnce([]); // periféricos vacíos

    const buf = await service.generarActa(1, { nombre: 'Admin TI' });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });
});
