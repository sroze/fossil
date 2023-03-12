import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { WriteController } from './controllers/write';
import { KeyLocatorSymbol, SystemStore, SystemDatabasePool } from './symbols';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { KeyLocator, TokenAuthenticator } from 'store-security';
import { StoreLocator } from 'store-locator';
import { ReadController } from './controllers/read';
import { HttpAuthenticator } from './services/http-authenticator';
import { HttpStoreLocator } from './services/http-store-locator';
import { SubscribeController } from './controllers/subscribe';
import { DatabaseKeyLocator } from './services/database-key-locator';
import { CookieHandshakeController } from './controllers/cookie-handshake';

@Module({
  imports: [],
  controllers: [
    WriteController,
    ReadController,
    SubscribeController,
    CookieHandshakeController,
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
