import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { WriteController } from './modules/store/controllers/write';
import { KeyLocatorSymbol, SystemDatabasePool, SystemStore } from './symbols';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { KeyLocator, TokenAuthenticator } from 'store-security';
import { StoreLocator } from 'store-locator';
import { ReadController } from './modules/store/controllers/read';
import { HttpAuthenticator } from './modules/store/services/http-authenticator';
import { HttpStoreLocator } from './modules/store/services/http-store-locator';
import { SseStreamController } from './modules/ephemeral-subscription/controllers/sse-stream';
import { DatabaseKeyLocator } from './modules/store/services/database-key-locator';
import { CookieHandshakeController } from './modules/ephemeral-subscription/controllers/cookie-handshake';
import { SqsProxyController } from './modules/sqs-relay/controllers/sqs-proxy';
import { SQSClient } from '@aws-sdk/client-sqs';
import { PrepareQueueProcess } from './modules/sqs-relay/processes/prepare-queue';
import { SqsRelayRunner } from './modules/sqs-relay/runner/runner';
import { PublicKeysReadModel } from './modules/store/read-models/keys';
import { RunningSubscriptionsManager } from './modules/sqs-relay/runner-pool/manager';
import { DurableSubscriptionsReadModel } from './modules/durable-subscription/read-models/durable-subscriptions';
import { DurableSubscriptionFactory } from './modules/durable-subscription/factory';
import { PollAndCommitSubscriptionController } from './modules/durable-subscription/controllers/poll-and-commit';
import { DurableSubscriptionManagementController } from './modules/durable-subscription/controllers/management';
import { SqsRelayManagement } from './modules/sqs-relay/controllers/management';
import { EskitService } from './utils/eskit-nest';
import { aggregate as durableSubscription } from './modules/durable-subscription/domain/aggregate';
import { aggregate as sqsRelay } from './modules/sqs-relay/domain/decider';
import { aggregate as store } from './modules/store/domain/aggregate';
import { KeysController } from './modules/store/controllers/keys';
import { StoreManagementController } from './modules/store/controllers/management';
import { HttpAuthorizer } from './modules/store/services/http-authorizer';
import { TokensController } from './modules/store/controllers/tokens';
import { GenerateTokenCommand } from './modules/store/commands/generake-token';
import { InitCommand } from './modules/store/commands/init';
import { PollController } from './modules/ephemeral-subscription/controllers/ndjson-stream';

@Module({
  imports: [PrometheusModule.register()],
  controllers: [
    WriteController,
    ReadController,
    SseStreamController,
    CookieHandshakeController,
    PollController,
    SqsProxyController,
    PollAndCommitSubscriptionController,
    DurableSubscriptionManagementController,
    SqsRelayManagement,
    KeysController,
    StoreManagementController,
    TokensController,
  ],
  providers: [
    HttpAuthenticator,
    HttpStoreLocator,
    HttpAuthorizer,
    {
      provide: SystemDatabasePool,
      useFactory: () =>
        new Pool({
          connectionString: process.env.API_DATABASE_URL!,
          max: 10,
          connectionTimeoutMillis: 10000,
          statement_timeout: 60000,
        }),
    },
    {
      provide: KeyLocatorSymbol,
      inject: [SystemDatabasePool],
      useFactory: (pool: Pool) => new DatabaseKeyLocator(pool),
    },
    {
      provide: TokenAuthenticator,
      useFactory: (keyLocator: KeyLocator) =>
        new TokenAuthenticator(keyLocator),
      inject: [KeyLocatorSymbol],
    },
    {
      provide: SystemStore,
      useFactory: (pool: Pool) => new MessageDbStore(new MessageDbClient(pool)),
      inject: [SystemDatabasePool],
    },
    {
      provide: StoreLocator,
      useFactory: (system: IEventStore) => new StoreLocator(system),
      inject: [SystemStore],
    },
    {
      provide: SQSClient,
      useFactory: () =>
        new SQSClient({
          credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
          },
          region: 'us-east-1', // is needed for `localstack`
          endpoint: 'http://127.0.0.1:4566',
        }),
    },
    PrepareQueueProcess,
    RunningSubscriptionsManager,
    SqsRelayRunner,
    PublicKeysReadModel,
    DurableSubscriptionsReadModel,
    DurableSubscriptionFactory,
    {
      provide: durableSubscription.symbol,
      useFactory: (store: IEventStore) =>
        new EskitService(
          store,
          durableSubscription.decider,
          durableSubscription.category,
        ),
      inject: [SystemStore],
    },
    {
      provide: sqsRelay.symbol,
      useFactory: (store: IEventStore) =>
        new EskitService(store, sqsRelay.decider, sqsRelay.category),
      inject: [SystemStore],
    },
    {
      provide: store.symbol,
      useFactory: (s: IEventStore) =>
        new EskitService(s, store.decider, store.category),
      inject: [SystemStore],
    },
    GenerateTokenCommand,
    InitCommand,
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(SystemDatabasePool)
    private readonly systemPool: Pool,
  ) {}

  async onApplicationShutdown() {
    await this.systemPool.end();
  }
}
