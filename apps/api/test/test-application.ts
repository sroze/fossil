import { INestApplication } from '@nestjs/common';
import {
  FossilClaims,
  GeneratedKey,
  generateKey,
  generateToken,
} from 'store-security';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { InMemoryKeyLocator } from './key-locator';
import { configureApplication } from '../src/application/configure';
import type { Plugin, SuperAgentRequest } from 'superagent';
import { DateTime } from 'luxon';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  KeyLocatorSymbol,
  SystemDatabasePool,
  SystemStore,
} from '../src/symbols';
import { createStore } from '../src/modules/store/utils/testing';
import { IEventStore } from 'event-store';
import { v4 } from 'uuid';
import { DatabaseKeyLocator } from '../src/modules/store/services/database-key-locator';
import { Pool } from 'pg';

const asyncPlugin = (
  plugin: (req: SuperAgentRequest) => Promise<void>,
): Plugin => {
  return (req: SuperAgentRequest) => {
    const actualThen = req.then;

    req.then = async (...args: any[]) => {
      await plugin(req);

      return actualThen.apply(req, args);
    };
  };
};

export class TestApplication {
  private app: INestApplication;
  private keyForStore: GeneratedKey;

  public defaultStoreId: string;

  get<TInput = any, TResult = TInput>(
    // eslint-disable-next-line @typescript-eslint/ban-types
    typeOrToken: Type<TInput> | Function | string | symbol,
  ): TResult {
    return this.app.get(typeOrToken);
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }

  generateToken(
    storeId: string,
    payload: Partial<FossilClaims> = {},
  ): Promise<string> {
    return generateToken(this.keyForStore.private, {
      exp: DateTime.now().valueOf() / 1000 + 3600,
      fossil: {
        store_id: storeId,
        ...payload,
      },
    });
  }

  withToken(storeId: string, payload: Partial<FossilClaims> = {}): Plugin {
    return asyncPlugin(async (req: SuperAgentRequest) => {
      const token = await this.generateToken(storeId, payload);

      req.set('authorization', `Bearer ${token}`);
    });
  }

  static create() {
    return new TestApplication();
  }

  async init(defaultStoreIdentifier = v4()): Promise<TestApplication> {
    this.defaultStoreId = defaultStoreIdentifier;
    this.keyForStore = await generateKey();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KeyLocatorSymbol)
      .useFactory({
        inject: [SystemDatabasePool],
        factory: (pool: Pool) =>
          new InMemoryKeyLocator(
            [
              {
                storeId: defaultStoreIdentifier,
                keyId: this.keyForStore.private.kid,
                key: this.keyForStore.public,
              },
            ],
            new DatabaseKeyLocator(pool),
          ),
      })
      .compile();

    this.app = configureApplication(moduleRef.createNestApplication());
    await this.app.init();

    await createStore(this.app, defaultStoreIdentifier);

    return this;
  }

  async close() {
    await this.app.close();
  }
}
