import { MigrationInterface, QueryRunner } from "typeorm";

// ユーザーに「ゲストかどうか」の印を付ける。今いるユーザーは全員 false（ゲストではない）
export class AddIsGuestToUser1794800000000 implements MigrationInterface {
	name = "AddIsGuestToUser1794800000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "user" ADD "isGuest" boolean NOT NULL DEFAULT false`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isGuest"`);
	}
}
