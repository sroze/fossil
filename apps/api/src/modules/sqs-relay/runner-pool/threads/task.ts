import { expose } from 'threads/worker';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { INestApplication } from '@nestjs/common';
import { SqsRelayRunner } from '../../runner/runner';

let app: INestApplication;
let abortController: AbortController;
let subscriptionPromise: Promise<void>;

const task = {
  async start({ id }: { id: string }) {
    abortController = new AbortController();
    app = await NestFactory.create(AppModule);
    subscriptionPromise = app
      .get(SqsRelayRunner)
      .run(id, abortController.signal);
  },

  async stop() {
    abortController.abort();
    await subscriptionPromise;
    await app.close();
  },
};

export type Task = typeof task;

expose(task);
