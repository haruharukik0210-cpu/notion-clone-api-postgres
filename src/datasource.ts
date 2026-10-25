// .env を DataSource の生成より先に読み込む（Render では環境変数が直接設定されるため影響なし）
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  migrationsTableName: 'migrations',
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  synchronize: false,
  migrationsRun: true,
  logging: ['query', 'error', 'log'],
  entities: [process.env.DB_TYPEORM_ENTITIES || 'dist/**/*.entity.js'],
  migrations: [process.env.DB_TYPEORM_MIGRATIONS || 'dist/migrations/**/*.js'],
  subscribers: [
    process.env.DB_TYPEORM_SUBSCRIBERS || 'dist/subscriber/**/*.js',
  ],
});
