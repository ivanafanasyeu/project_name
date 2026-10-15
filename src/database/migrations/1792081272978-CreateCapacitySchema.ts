import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCapacitySchema1792081272978 implements MigrationInterface {
    name = 'CreateCapacitySchema1792081272978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "currency" character varying(3) NOT NULL, "limit_minor" bigint NOT NULL, "reserved_minor" bigint NOT NULL DEFAULT '0', "last_treasury_seq" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "programs" ADD CONSTRAINT "CHK_programs_reserved_minor_range" CHECK ("reserved_minor" >= 0 AND "reserved_minor" <= "limit_minor")`);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('RESERVED', 'RELEASED')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "program_id" uuid NOT NULL, "invoice_id" character varying(255) NOT NULL, "original_amount_minor" bigint NOT NULL, "original_currency" character varying(3) NOT NULL, "reserved_amount_minor" bigint NOT NULL, "fx_rate" numeric(30,12) NOT NULL, "status" "public"."reservations_status_enum" NOT NULL, "released_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_reservations_program_invoice" UNIQUE ("program_id", "invoice_id"), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."capacity_movements_type_enum" AS ENUM('RESERVE', 'RELEASE')`);
        await queryRunner.query(`CREATE TABLE "capacity_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "program_id" uuid NOT NULL, "reservation_id" uuid NOT NULL, "type" "public"."capacity_movements_type_enum" NOT NULL, "amount_minor" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_19fbd7147540cd0c4d3c479f9db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "capacity_movements" ADD CONSTRAINT "CHK_capacity_movements_positive_amount" CHECK ("amount_minor" > 0)`);
        await queryRunner.query(`CREATE FUNCTION reject_capacity_movement_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'capacity_movements is append-only'; END; $$`);
        await queryRunner.query(`CREATE TRIGGER capacity_movements_reject_row_mutation BEFORE UPDATE OR DELETE ON "capacity_movements" FOR EACH ROW EXECUTE FUNCTION reject_capacity_movement_mutation()`);
        await queryRunner.query(`CREATE TRIGGER capacity_movements_reject_truncate BEFORE TRUNCATE ON "capacity_movements" FOR EACH STATEMENT EXECUTE FUNCTION reject_capacity_movement_mutation()`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_5b66cec125d58fec3946454b88c" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "capacity_movements" ADD CONSTRAINT "FK_97f92afe5c31d03447a5f74a88f" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "capacity_movements" ADD CONSTRAINT "FK_43a3a9cb59206dfbda277cc8fbf" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "capacity_movements" DROP CONSTRAINT "FK_43a3a9cb59206dfbda277cc8fbf"`);
        await queryRunner.query(`ALTER TABLE "capacity_movements" DROP CONSTRAINT "FK_97f92afe5c31d03447a5f74a88f"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_5b66cec125d58fec3946454b88c"`);
        await queryRunner.query(`DROP TRIGGER "capacity_movements_reject_truncate" ON "capacity_movements"`);
        await queryRunner.query(`DROP TRIGGER "capacity_movements_reject_row_mutation" ON "capacity_movements"`);
        await queryRunner.query(`DROP FUNCTION reject_capacity_movement_mutation()`);
        await queryRunner.query(`DROP TABLE "capacity_movements"`);
        await queryRunner.query(`DROP TYPE "public"."capacity_movements_type_enum"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`DROP TABLE "programs"`);
    }

}
