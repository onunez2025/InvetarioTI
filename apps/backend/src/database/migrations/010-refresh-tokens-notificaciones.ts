import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefreshTokensNotificaciones1685000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='refresh_tokens')
      CREATE TABLE inventario_ti.refresh_tokens (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
        token_hash  NVARCHAR(200) NOT NULL,
        expires_at  DATETIME2 NOT NULL,
        revoked     BIT NOT NULL DEFAULT 0,
        creado_en   DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.refresh_tokens') AND name='IX_rt_usuario')
        CREATE INDEX IX_rt_usuario ON inventario_ti.refresh_tokens(usuario_id)
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.refresh_tokens') AND name='IX_rt_hash')
        CREATE INDEX IX_rt_hash ON inventario_ti.refresh_tokens(token_hash)
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('inventario_ti') AND name='notificaciones')
      CREATE TABLE inventario_ti.notificaciones (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        usuario_id  INT NOT NULL REFERENCES inventario_ti.usuarios(id),
        tipo        NVARCHAR(50) NOT NULL,
        titulo      NVARCHAR(200) NOT NULL,
        mensaje     NVARCHAR(1000) NOT NULL,
        leida       BIT NOT NULL DEFAULT 0,
        creado_en   DATETIME2 DEFAULT GETUTCDATE()
      )
    `);
    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('inventario_ti.notificaciones') AND name='IX_noti_usuario')
        CREATE INDEX IX_noti_usuario ON inventario_ti.notificaciones(usuario_id, leida)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.notificaciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS inventario_ti.refresh_tokens`);
  }
}
