import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { WriteController } from './modules/store/controllers/write';
import { KeyLocatorSymbol, SystemStore, SystemDatabasePool } from './symbols';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { KeyLocator, TokenAuthenticator } from 'store-security';
import { StoreLocator } from 'store-locator';
import { ReadController } from './modules/store/controllers/read';
import { HttpAuthenticator } from './modules/store/services/http-authenticator';
import { HttpStoreLocator } from './modules/store/services/http-store-locator';
import { SubscribeController } from './modules/ephemeral-subscription/controllers/subscribe';
import { DatabaseKeyLocator } from './modules/store/services/database-key-locator';
import { CookieHandshakeController } from './modules/ephemeral-subscription/controllers/cookie-handshake';
import { ReceiveSubscriptionController } from './modules/sqs-subscription/controllers/receive-subscription';
import { SQSClient } from '@aws-sdk/client-sqs';
import { PrepareSubscriptionProcess } from './modules/sqs-subscription/processes/prepare-subscription';
import { SqsSubscriptionsReadModel } from './modules/sqs-subscription/read-models/sqs-subscriptions';
import { SubscriptionRunner } from './modules/sqs-subscription/runner/runner';
import { PublicKeysReadModel } from './modules/store/read-models/public-keys';
import { RunningSubscriptionsManager } from './modules/sqs-subscription/runner/manager';

@Module({
  imports: [],
  controllers: [
    WriteController,
    ReadController,
    SubscribeController,
    CookieHandshakeController,
    ReceiveSubscriptionController,
  ],
  providers: [
    HttpAuthenticator,
    HttpStoreLocator,
    {
      provide: SystemDatabasePool,
      useFactory: () =>
        new Pool({
          connectionString: process.env.DATABASE_URL!,
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
    PrepareSubscriptionProcess,
    SqsSubscriptionsReadModel,
    RunningSubscriptionsManager,
    SubscriptionRunner,
    PublicKeysReadModel,
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
