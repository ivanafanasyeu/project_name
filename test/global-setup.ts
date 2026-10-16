const TEST_DATABASE_NAME = 'project_name_test';

export default async function globalSetup() {
  if (process.env.DB_NAME !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to reset e2e database: expected DB_NAME=${TEST_DATABASE_NAME}, received ${process.env.DB_NAME ?? '<unset>'}`,
    );
  }

  const { default: dataSource } = await import(
    '../dist/database/data-source.js'
  );
  if (dataSource.options.database !== TEST_DATABASE_NAME) {
    throw new Error('Refusing to reset a non-test database');
  }

  await dataSource.initialize();
  try {
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.query(
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public',
    );
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
