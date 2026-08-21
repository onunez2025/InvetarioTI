import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuarios1002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.usuarios (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        nombre        NVARCHAR(100) NOT NULL,
        email         NVARCHAR(150) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        rol           NVARCHAR(20) NOT NULL,
        departamento  NVARCHAR(100),
        activo        BIT DEFAULT 1,
        creado_en     DATETIME2 DEFAULT GETUTCDATE(),
        ultimo_login  DATETIME2
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.usuarios`);
  }
}
