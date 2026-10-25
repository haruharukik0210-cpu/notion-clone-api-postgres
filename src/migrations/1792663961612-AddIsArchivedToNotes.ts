import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsArchivedToNotes1792663961612 implements MigrationInterface {
	name = "AddIsArchivedToNotes1792663961612";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "notes" ADD "isArchived" boolean NOT NULL DEFAULT false`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "isArchived"`);
	}
}
