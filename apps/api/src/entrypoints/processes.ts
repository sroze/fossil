import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { run } from '../utils/runners';
import { PrepareQueueProcess } from '../modules/sqs-relay/processes/prepare-queue';
import { PublicKeysReadModel } from '../modules/store/read-models/keys';
import { RunningSubscriptionsManager } from '../modules/sqs-relay/runner-pool/manager';
import { DurableSubscriptionsReadModel } from '../modules/durable-subscription/read-models/durable-subscriptions';

require('dotenv').config();

void run(NestFactory.create(AppModule), [
  // Read models
  PublicKeysReadModel,
  DurableSubscriptionsReadModel,

  // Async processes
  PrepareQueueProcess,
  RunningSubscriptionsManager,
]);
