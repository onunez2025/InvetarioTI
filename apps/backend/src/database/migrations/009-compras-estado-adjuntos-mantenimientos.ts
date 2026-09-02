import { MigrationInterface, QueryRunner } from 'typeorm';

export class ComprasEstadoAdjuntosMantenimientos1685000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='estado')
        ALTER TABLE inventario_ti.compras ADD estado NVARCHAR(20) NOT NULL DEFAULT 'BORRADOR'
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('inventario_ti.compras') AND name='CK_compras_estado')
        ALTER TABLE inventario_ti.compras ADD CONSTRAINT CK_compras_estado CHECK (estado IN ('BORRADOR','APROBADO','RECIBIDO'))
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='adjunto_url')
        ALTER TABLE inventario_ti.compras ADD adjunto_url NVARCHAR(500) NULL
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='mantenimientos')
      CREATE TABLE inventario_ti.mantenimientos (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        equipo_id    INT NOT NULL REFERENCES inventario_ti.equipos(id),
        tipo         NVARCHAR(20) NOT NULL CHECK (tipo IN ('PREVENTIVO','CORRECTIVO','GARANTIA')),
        fecha_inicio DATE NOT NULL,
        fecha_fin    DATE,
        tecnico      NVARCHAR(150),
        descripcion  NVARCHAR(1000),
        costo        DECIMAL(10,2),
        resultado    NVARCHAR(500),
        creado_por   INT REFERENCES inventario_ti.usuarios(id),
        creado_en    DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.mantenimientos') AND name='IX_mant_equipo')
        CREATE INDEX IX_mant_equipo ON inventario_ti.mantenimientos(equipo_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.mantenimientos`);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_compras_estado')
        ALTER TABLE inventario_ti.compras DROP CONSTRAINT CK_compras_estado
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='estado')
        ALTER TABLE inventario_ti.compras DROP COLUMN estado
    `);
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('inventario_ti.compras') AND name='adjunto_url')
        ALTER TABLE inventario_ti.compras DROP COLUMN adjunto_url
    `);
  }
}
