import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const getDir = (): string => {
  try {
    return __dirname;
  } catch {
    if (path.basename(process.cwd()) === 'backend') {
      return path.resolve(process.cwd(), 'src/database');
    }
    return path.resolve(process.cwd(), 'apps/backend/src/database');
  }
};

const dir = getDir();

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA ?? 'inventario_ti',
  options: { encrypt: true, trustServerCertificate: false },
  entities: [path.join(dir, '..', '**', '*.entity{.ts,.js}')],
  migrations: [path.join(dir, 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
