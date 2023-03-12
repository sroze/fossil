import { StoreLocator } from 'store-locator';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { SQSClient } from '@aws-sdk/client-sqs';

const getPool = (connectionString: string = process.env.DATABASE_URL!) =>
  new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    statement_timeout: 60000,
  });

export const getSystemStore = (): IEventStore =>
  new MessageDbStore(new MessageDbClient(getPool()));
export const getStoreLocator = () => new StoreLocator(getSystemStore());
export const getSQSClient = () =>
  new SQSClient({
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    region: 'eu-west-2',
    endpoint: 'http://127.0.0.1:4566',
  });
