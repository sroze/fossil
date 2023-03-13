import { expose } from 'threads/worker';
import type { SQSSubscriptionRow } from '../../read-models/sqs-subscriptions';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { INestApplication } from '@nestjs/common';
import { SubscriptionRunner } from '../runner';

let app: INestApplication;
let abortController: AbortController;
let subscriptionPromise: Promise<void>;

const task = {
  async start(subscription: SQSSubscriptionRow) {
    abortController = new AbortController();
    app = await NestFactory.create(AppModule);
    subscriptionPromise = app
      .get(SubscriptionRunner)
      .run(subscription, abortController.signal);
  },

  async stop() {
    abortController.abort();
    await subscriptionPromise;
    await app.close();
  },
};

export type Task = typeof task;

expose(task);
