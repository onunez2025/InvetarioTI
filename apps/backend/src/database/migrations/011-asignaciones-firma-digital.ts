import { MigrationInterface, QueryRunner } from 'typeorm';

export class AsignacionesFirmaDigital011 implements MigrationInterface {
  name = 'AsignacionesFirmaDigital011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('inventario_ti.asignaciones')
          AND name = 'firma_digital'
      )
      BEGIN
        ALTER TABLE inventario_ti.asignaciones ADD firma_digital NVARCHAR(MAX) NULL;
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('inventario_ti.asignaciones')
          AND name = 'fecha_firma'
      )
      BEGIN
        ALTER TABLE inventario_ti.asignaciones ADD fecha_firma DATETIME2 NULL;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('inventario_ti.asignaciones')
          AND name = 'firma_digital'
      )
      BEGIN
        ALTER TABLE inventario_ti.asignaciones DROP COLUMN firma_digital;
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('inventario_ti.asignaciones')
          AND name = 'fecha_firma'
      )
      BEGIN
        ALTER TABLE inventario_ti.asignaciones DROP COLUMN fecha_firma;
      END
    `);
  }
}
