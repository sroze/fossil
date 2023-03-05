import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { configureApplication } from '../application/configure';
import { main as publicKeys } from '../read-models/public-keys';
import { Pool } from 'pg';
import { SystemStore, SystemDatabasePool } from '../symbols';
import { IEventStore } from 'event-store';

require('dotenv').config();

async function bootstrap() {
  const app = configureApplication(await NestFactory.create(AppModule));

  const abortController = new AbortController();
  process.on('SIGINT', () => abortController.abort());
  process.on('SIGTERM', () => abortController.abort());

  app.enableShutdownHooks();

  const pool: Pool = app.get(SystemDatabasePool);
  const eventStore: IEventStore = app.get(SystemStore);

  publicKeys(pool, eventStore, abortController.signal);
}

void bootstrap();
