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

  it('generarActaPorAsignacion retorna Buffer no vacío', async () => {
    mockDs.query.mockResolvedValueOnce([
      {
        id: 1,
        fecha_inicio: '2026-09-03',
        colab_nombre: 'Carlos Mendoza',
        colab_dni: '45678912',
        colab_cargo: 'Desarrollador',
        equipo_tipo: 'Laptop',
        equipo_codigo: 'MT-001',
        equipo_serie: 'SN12345',
        modelo_nombre: 'ThinkPad T14',
      },
    ]);

    const buf = await service.generarActaPorAsignacion(1);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });
});
