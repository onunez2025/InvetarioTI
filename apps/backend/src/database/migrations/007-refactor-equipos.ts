import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEquipos1007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar nuevas columnas
    await queryRunner.query(`
      ALTER TABLE inventario_ti.equipos
        ADD modelo_id         INT REFERENCES inventario_ti.modelos(id),
            compra_detalle_id INT REFERENCES inventario_ti.compras_detalle(id)
    `);
    // Hacer nombre nullable (puede tener NOT NULL constraint)
    await queryRunner.query(`ALTER TABLE inventario_ti.equipos ALTER COLUMN nombre NVARCHAR(150) NULL`);
    // Eliminar columnas de catálogo (tabla vacía, sin riesgo de datos)
    // Azure SQL: verificar existencia antes de eliminar (drop default constraints implícitos primero)
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'IX_equipos_tipo')
        DROP INDEX IX_equipos_tipo ON inventario_ti.equipos
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'tipo')
        ALTER TABLE inventario_ti.equipos DROP COLUMN tipo
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'marca')
        ALTER TABLE inventario_ti.equipos DROP COLUMN marca
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'modelo')
        ALTER TABLE inventario_ti.equipos DROP COLUMN modelo
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'firmware')
        ALTER TABLE inventario_ti.equipos DROP COLUMN firmware
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'version')
        ALTER TABLE inventario_ti.equipos DROP COLUMN version
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'end_of_sale')
        ALTER TABLE inventario_ti.equipos DROP COLUMN end_of_sale
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'IX_equipos_end_of_support')
        DROP INDEX IX_equipos_end_of_support ON inventario_ti.equipos
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'end_of_support')
        ALTER TABLE inventario_ti.equipos DROP COLUMN end_of_support
    `);
    await queryRunner.query(`CREATE INDEX IX_equipos_modelo ON inventario_ti.equipos(modelo_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'IX_equipos_modelo')
        DROP INDEX IX_equipos_modelo ON inventario_ti.equipos
    `);
    await queryRunner.query(`
      DECLARE @fk NVARCHAR(200);
      SELECT @fk = name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('inventario_ti.equipos') AND name LIKE '%modelo_id%';
      IF @fk IS NOT NULL EXEC('ALTER TABLE inventario_ti.equipos DROP CONSTRAINT [' + @fk + ']');
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'modelo_id')
        ALTER TABLE inventario_ti.equipos DROP COLUMN modelo_id
    `);
    await queryRunner.query(`
      DECLARE @fk2 NVARCHAR(200);
      SELECT @fk2 = name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('inventario_ti.equipos') AND name LIKE '%compra_detalle_id%';
      IF @fk2 IS NOT NULL EXEC('ALTER TABLE inventario_ti.equipos DROP CONSTRAINT [' + @fk2 + ']');
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('inventario_ti.equipos') AND name = 'compra_detalle_id')
        ALTER TABLE inventario_ti.equipos DROP COLUMN compra_detalle_id
    `);
    await queryRunner.query(`
      ALTER TABLE inventario_ti.equipos
        ADD marca NVARCHAR(100), modelo NVARCHAR(150), tipo NVARCHAR(50),
            firmware NVARCHAR(100), version NVARCHAR(50),
            end_of_sale DATE, end_of_support DATE
    `);
  }
}
