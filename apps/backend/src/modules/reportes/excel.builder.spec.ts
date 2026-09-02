import { buildExcel } from './excel.builder';

describe('excel.builder', () => {
  it('buildExcel retorna Buffer con datos', async () => {
    const buf = await buildExcel(
      'Test',
      [{ key: 'nombre', header: 'Nombre', width: 20 }],
      [{ nombre: 'Prueba' }],
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });
});
