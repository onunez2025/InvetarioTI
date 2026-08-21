import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipos1003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.equipos (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        empresa        NVARCHAR(100) NOT NULL,
        nombre         NVARCHAR(150) NOT NULL,
        gerencia       NVARCHAR(100),
        departamento   NVARCHAR(100),
        codigo         NVARCHAR(50),
        ceco           NVARCHAR(100),
        ubicacion      NVARCHAR(150),
        tipo           NVARCHAR(50),
        marca          NVARCHAR(100),
        modelo         NVARCHAR(150),
        serie          NVARCHAR(100) UNIQUE,
        firmware       NVARCHAR(100),
        version        NVARCHAR(50),
        end_of_sale    DATE,
        end_of_support DATE,
        estado         NVARCHAR(20) DEFAULT 'ACTIVO',
        creado_por     INT REFERENCES INV_ZYL.usuarios(id),
        creado_en      DATETIME2 DEFAULT GETUTCDATE(),
        actualizado_en DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_equipos_tipo ON INV_ZYL.equipos(tipo)`);
    await queryRunner.query(`CREATE INDEX IX_equipos_departamento ON INV_ZYL.equipos(departamento)`);
    await queryRunner.query(`CREATE INDEX IX_equipos_end_of_support ON INV_ZYL.equipos(end_of_support)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.equipos`);
  }
}
