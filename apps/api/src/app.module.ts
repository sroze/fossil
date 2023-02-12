import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { WriteController } from './controllers/write';
import { SystemStore } from './symbols';
import { Pool } from 'pg';
import { IEventStore, MessageDbClient, MessageDbStore } from 'event-store';
import { TokenAuthenticator } from 'store-security';
import { InMemoryKeyLocator } from '../test/key-locator';
import { StoreLocator } from 'store-locator';

const SystemStoreDatabasePool = Symbol('SystemStoreDatabasePool');

@Module({
  imports: [],
  controllers: [WriteController],
  providers: [
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
      provide: TokenAuthenticator,
      useFactory: () => new TokenAuthenticator(new InMemoryKeyLocator([])),
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
