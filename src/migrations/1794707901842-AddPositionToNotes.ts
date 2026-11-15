import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionToNotes1794707901842 implements MigrationInterface {
	name = "AddPositionToNotes1794707901842";

	public async up(queryRunner: QueryRunner): Promise<void> {
		// 1. 並び順の列を足す（今あるノートは、いったん全部 0 になる）
		await queryRunner.query(
			`ALTER TABLE "notes" ADD "position" integer NOT NULL DEFAULT 0`,
		);

		// 2. 今あるノートに、同じ持ち主・同じ親の中で 0, 1, 2 … と番号を振る
		//    今のサイドバーは id の小さい順に見えているので、その順番を保つ
		//    （PARTITION BY は「グループごとに数え直す」。parentId が null のもの同士も1つのグループになる）
		await queryRunner.query(`
			UPDATE "notes" AS n
			SET "position" = numbered.rn - 1
			FROM (
				SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId", "parentId" ORDER BY "id") AS rn
				FROM "notes"
			) AS numbered
			WHERE n."id" = numbered."id"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "position"`);
	}
}
