import { Pool } from 'pg';

const pools: Pool[] = [];

const killPools = () => {
  pools.forEach((pool) => pool.end());
};

process.on('SIGINT', killPools);
process.on('SIGTERM', killPools);

export const createPool = (connectionString: string) =>
  new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  });
