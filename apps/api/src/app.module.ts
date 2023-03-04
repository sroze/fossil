import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { WriteController } from './controllers/write';
import { SystemStore } from './symbols';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { KeyLocator, TokenAuthenticator } from 'store-security';
import { InMemoryKeyLocator } from '../test/key-locator';
import { StoreLocator } from 'store-locator';
import { ReadController } from './controllers/read';
import { HttpAuthenticator } from './services/http-authenticator';
import { HttpStoreLocator } from './services/http-store-locator';
import { SubscribeController } from './controllers/subscribe';

const SystemStoreDatabasePool = Symbol('SystemStoreDatabasePool');
export const KeyLocatorSymbol = Symbol('KeyLocator');

@Module({
  imports: [],
  controllers: [WriteController, ReadController, SubscribeController],
  providers: [
    HttpAuthenticator,
    HttpStoreLocator,
    {
      provide: SystemStoreDatabasePool,
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
      useFactory: () => new InMemoryKeyLocator([]),
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
      inject: [SystemStoreDatabasePool],
    },
    {
      provide: StoreLocator,
      useFactory: (system: IEventStore) => new StoreLocator(system),
      inject: [SystemStore],
    },
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(SystemStoreDatabasePool)
    private readonly systemPool: Pool,
  ) {}

  async onApplicationShutdown() {
    await this.systemPool.end();
  }
}
