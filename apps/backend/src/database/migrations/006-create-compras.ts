import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompras1006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inventario_ti.compras (
        id                INT IDENTITY(1,1) PRIMARY KEY,
        proveedor_id      INT NOT NULL REFERENCES inventario_ti.proveedores(id),
        numero_documento  NVARCHAR(50) NOT NULL,
        tipo_documento    NVARCHAR(20) NOT NULL
          CHECK (tipo_documento IN ('FACTURA','OC','BOLETA','NOTA_INGRESO')),
        fecha_documento   DATE NOT NULL,
        observaciones     NVARCHAR(500),
        creado_por        INT REFERENCES inventario_ti.usuarios(id),
        creado_en         DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE inventario_ti.compras_detalle (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        compra_id        INT NOT NULL REFERENCES inventario_ti.compras(id),
        modelo_id        INT NOT NULL REFERENCES inventario_ti.modelos(id),
        cantidad         INT NOT NULL CHECK (cantidad > 0),
        precio_unitario  DECIMAL(12,2)
      )
    `);
    await queryRunner.query(`CREATE INDEX IX_compras_detalle_compra ON inventario_ti.compras_detalle(compra_id)`);
    await queryRunner.query(`CREATE INDEX IX_compras_detalle_modelo ON inventario_ti.compras_detalle(modelo_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.compras_detalle`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.compras`);
  }
}
