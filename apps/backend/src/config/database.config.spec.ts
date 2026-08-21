import { getDatabaseConfig } from './database.config';

describe('getDatabaseConfig', () => {
  it('debe retornar configuración con schema INV_ZYL', () => {
    process.env.DB_HOST = 'soledbserver.database.windows.net';
    process.env.DB_PORT = '1433';
    process.env.DB_NAME = 'soledb-puntoventa';
    process.env.DB_USER = 'soledbserveradmin';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_SCHEMA = 'INV_ZYL';

    const config = getDatabaseConfig();

    expect(config.schema).toBe('INV_ZYL');
    expect(config.type).toBe('mssql');
    expect((config as any).options?.encrypt).toBe(true);
  });

  it('debe usar puerto 1433 por defecto', () => {
    delete process.env.DB_PORT;
    const config = getDatabaseConfig();
    expect(config.port).toBe(1433);
  });
});
