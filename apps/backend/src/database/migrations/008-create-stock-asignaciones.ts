import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockAsignaciones1685000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.stock_asignaciones (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        modelo_id       INT NOT NULL REFERENCES inventario_ti.modelos(id),
        colaborador_id  INT NOT NULL REFERENCES inventario_ti.colaboradores(id),
        cantidad        INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
        fecha_inicio    DATE NOT NULL,
        fecha_fin       DATE,
        observaciones   NVARCHAR(500),
        creado_por      INT REFERENCES inventario_ti.usuarios(id),
        creado_en       DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_sa_modelo      ON inventario_ti.stock_asignaciones(modelo_id)`);
    await queryRunner.query(`CREATE INDEX IX_sa_colaborador ON inventario_ti.stock_asignaciones(colaborador_id)`);
    await queryRunner.query(`CREATE INDEX IX_sa_fecha_fin   ON inventario_ti.stock_asignaciones(fecha_fin)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.stock_asignaciones`);
  }
}
