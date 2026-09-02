import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTablasSecundarias1685000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.asignaciones (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id     INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        usuario_id    INT NOT NULL REFERENCES INV_ZYL.usuarios(id),
        fecha_inicio  DATE NOT NULL,
        fecha_fin     DATE,
        observaciones NVARCHAR(500),
        creado_en     DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.historial_cambios (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id      INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        campo          NVARCHAR(50) NOT NULL,
        valor_anterior NVARCHAR(MAX),
        valor_nuevo    NVARCHAR(MAX),
        usuario_id     INT REFERENCES INV_ZYL.usuarios(id),
        fecha          DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.alertas (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id      INT NOT NULL REFERENCES INV_ZYL.equipos(id),
        tipo           NVARCHAR(30) NOT NULL,
        dias_restantes INT,
        leida          BIT DEFAULT 0,
        creado_en      DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE INV_ZYL.integraciones_log (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        tipo        NVARCHAR(50),
        metodo      NVARCHAR(10),
        endpoint    NVARCHAR(255),
        estado      NVARCHAR(20),
        codigo_http INT,
        respuesta   NVARCHAR(MAX),
        timestamp   DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.integraciones_log`);
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.alertas`);
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.historial_cambios`);
    await queryRunner.query(`DROP TABLE IF EXISTS INV_ZYL.asignaciones`);
  }
}
