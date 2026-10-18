import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTreasuryReconciliation1792350000000
  implements MigrationInterface
{
  name = 'AddTreasuryReconciliation1792350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."capacity_movements_type_enum" ADD VALUE 'RECONCILE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" DROP CONSTRAINT "CHK_capacity_movements_positive_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" ALTER COLUMN "reservation_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" ADD CONSTRAINT "CHK_capacity_movements_type_amount_reservation" CHECK (("type"::text IN ('RESERVE', 'RELEASE') AND "amount_minor" > 0 AND "reservation_id" IS NOT NULL) OR ("type"::text = 'RECONCILE' AND "amount_minor" <> 0 AND "reservation_id" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" DROP CONSTRAINT "CHK_capacity_movements_type_amount_reservation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" ALTER COLUMN "reservation_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "capacity_movements" ADD CONSTRAINT "CHK_capacity_movements_positive_amount" CHECK ("amount_minor" > 0)`,
    );
  }
}
