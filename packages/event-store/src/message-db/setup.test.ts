import { MessageDbStore } from './store';
import { MessageDbClient } from './client';
import { Pool } from 'pg';
import { v4 } from 'uuid';
import { setupMessageDb } from './setup';

function replaceDatabase(dsn: string, databaseName: string): string {
  const lastSlash = dsn.lastIndexOf('/');
  if (lastSlash === -1) {
    throw new Error(
      `DSN "${dsn}" is not a valid PostgreSQL connection string.`
    );
  }

  return dsn.substring(0, lastSlash + 1) + databaseName;
}

describe('MessageDB setup', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('is idempotent', async () => {
    const databaseName = `Test${v4().replace(/-/g, '')}`;

    await pool.query(`CREATE DATABASE ${databaseName}`);

    const testingDatabasePool = new Pool({
      connectionString: replaceDatabase(
        process.env.DATABASE_URL!,
        databaseName
      ),
    });

    try {
      await setupMessageDb(pool);
      await setupMessageDb(pool);
    } finally {
      await testingDatabasePool.end();
    }
  });
});
