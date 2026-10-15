import { join } from 'node:path';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'project_name',
  entities: [join(import.meta.dirname, '*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
