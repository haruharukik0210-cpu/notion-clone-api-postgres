import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIconToNotes1794118536504 implements MigrationInterface {
	name = "AddIconToNotes1794118536504";

	public async up(queryRunner: QueryRunner): Promise<void> {
		// NOT NULL も DEFAULT もつけないので、既存のノートは icon が null（アイコンなし）になる
		await queryRunner.query(
			`ALTER TABLE "notes" ADD "icon" character varying`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "icon"`);
	}
}
