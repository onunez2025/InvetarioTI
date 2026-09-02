import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModelosProveedores1685000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.proveedores (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        nombre    NVARCHAR(150) NOT NULL,
        ruc       NVARCHAR(20),
        telefono  NVARCHAR(30),
        email     NVARCHAR(100),
        activo    BIT NOT NULL DEFAULT 1,
        creado_en DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE inventario_ti.modelos (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        codigo          NVARCHAR(50)  NOT NULL,
        nombre          NVARCHAR(150) NOT NULL,
        marca           NVARCHAR(100),
        tipo            NVARCHAR(50),
        descripcion     NVARCHAR(500),
        tiene_serie     BIT NOT NULL DEFAULT 1,
        end_of_sale     DATE,
        end_of_support  DATE,
        firmware_ref    NVARCHAR(100),
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETUTCDATE(),
        actualizado_en  DATETIME2 DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_modelos_codigo UNIQUE (codigo)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_modelos_tipo ON inventario_ti.modelos(tipo)`);
    await queryRunner.query(`CREATE INDEX IX_modelos_tiene_serie ON inventario_ti.modelos(tiene_serie)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.modelos`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.proveedores`);
  }
}
