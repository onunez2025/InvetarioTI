import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchema1001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'INV_ZYL')
      BEGIN
        EXEC('CREATE SCHEMA INV_ZYL')
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS INV_ZYL`);
  }
}
