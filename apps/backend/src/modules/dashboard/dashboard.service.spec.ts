import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DataSource } from 'typeorm';

describe('DashboardService', () => {
  let svc: DashboardService;
  const mockDs = { query: jest.fn() };

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [DashboardService, { provide: DataSource, useValue: mockDs }],
    }).compile();
    svc = m.get(DashboardService);
    mockDs.query.mockReset();
  });

  it('resumen retorna KPIs', async () => {
    mockDs.query
      .mockResolvedValueOnce([
        {
          totalEquipos: 5,
          activos: 4,
          enMantenimiento: 1,
          bajas: 0,
          eosProximos90: 2,
          colaboradoresActivos: 10,
          equiposSinAsignar: 1,
        },
      ])
      .mockResolvedValueOnce([{ stockBajo: 1 }]);
    const r = await svc.resumen();
    expect(r.totalEquipos).toBe(5);
    expect(r.stockBajo).toBe(1);
  });

  it('graficos retorna porTipo, porGerencia y adquisicionesPorMes', async () => {
    mockDs.query
      .mockResolvedValueOnce([{ tipo: 'LAPTOP', total: 10 }])
      .mockResolvedValueOnce([{ gerencia: 'TI', total: 5 }])
      .mockResolvedValueOnce([{ mes: '2026-08', cantidad: 3 }]);
    const r = await svc.graficos();
    expect(r.porTipo).toHaveLength(1);
    expect(r.porGerencia).toHaveLength(1);
    expect(r.adquisicionesPorMes).toHaveLength(1);
  });

  it('eosProximos retorna lista de modelos', async () => {
    mockDs.query.mockResolvedValueOnce([
      { modeloId: 1, codigo: 'MOD1', nombre: 'Modelo 1', totalUnidades: 2 },
    ]);
    const r = await svc.eosProximos();
    expect(r.data).toHaveLength(1);
  });

  it('actividadReciente retorna lista de auditoria', async () => {
    mockDs.query.mockResolvedValueOnce([
      { id: 1, tabla: 'equipos', accion: 'UPDATE', descripcion: 'test' },
    ]);
    const r = await svc.actividadReciente();
    expect(r.data).toHaveLength(1);
  });
});
