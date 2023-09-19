import { Pool } from 'pg';
import path from 'path';
import * as fs from 'fs';

let setupInstructions = fs.readFileSync(
  path.resolve(__dirname, 'setup.sql'),
  'utf8'
);

export async function setupMessageDb(pool: Pool): Promise<void> {
  await pool.query(setupInstructions);
}
