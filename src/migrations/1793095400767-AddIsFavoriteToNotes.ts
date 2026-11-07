import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsFavoriteToNotes1793095400767 implements MigrationInterface {
	name = "AddIsFavoriteToNotes1793095400767";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "notes" ADD "isFavorite" boolean NOT NULL DEFAULT false`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "isFavorite"`);
	}
}
