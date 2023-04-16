import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { run } from '../utils/runners';
import { PrepareSubscriptionProcess } from '../modules/sqs-subscription/processes/prepare-subscription';
import { PublicKeysReadModel } from '../modules/store/read-models/public-keys';
import { SqsSubscriptionsReadModel } from '../modules/sqs-subscription/read-models/sqs-subscriptions';
import { RunningSubscriptionsManager } from '../modules/sqs-subscription/runner-pool/manager';
import { DurableSubscriptionsReadModel } from '../modules/durable-subscription/read-models/durable-subscriptions';

require('dotenv').config();

void run(NestFactory.create(AppModule), [
  // Read models
  PublicKeysReadModel,
  SqsSubscriptionsReadModel,
  DurableSubscriptionsReadModel,

  // Async processes
  PrepareSubscriptionProcess,
  RunningSubscriptionsManager,
]);
