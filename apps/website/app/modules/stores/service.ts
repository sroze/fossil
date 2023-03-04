import { v4 } from 'uuid';
import { AnyStoreEvent, StoreCreated } from './domain/events';
import { Store } from './domain/store';
import {
  AppendResult,
  EventWrittenWithMetadata,
  IEventStore,
} from 'event-store';
import { accumulate } from '../event-store/accumulate';
import { fossilEventStore } from '../event-store/store.backend';

// TODO: Simplify all of this with `eskit`'s `createTransact`  (https://github.com/birdiecare/node-packages/tree/main/packages/eskit)
// TODO: Add `users` to stores, who have access to these stores.
// TODO: Create a read-model that has the list of stores per user.

// Commands
type CreateStoreCommand = {
  name: string;
  region: 'london';
};

type GrantAccessToUserCommand = {
  user_id: string;
};

export class StoreService {
  public static resolve(): StoreService {
    return new StoreService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {}

  async create(command: CreateStoreCommand): Promise<string> {
    const identifier = v4();
    const created: StoreCreated = {
      id: v4(),
      type: 'StoreCreated',
      data: {
        ...command,
        store_id: identifier,
      },
    };

    await this.write(identifier, [created], -1n);

    return identifier;
  }

  grantAccess;

  write(
    identifier: string,
    events: Omit<AnyStoreEvent, 'id'>[],
    expectedVersion?: bigint
  ): Promise<AppendResult> {
    return this.client.appendEvents(
      `Store-${identifier}`,
      events,
      expectedVersion === undefined ? null : expectedVersion
    );
  }

  async load(identifier: string): Promise<Store> {
    const events = await accumulate(
      this.client.readStream(`Store-${identifier}`, 0n)
    );

    return new Store(events as EventWrittenWithMetadata<AnyStoreEvent>[]);
  }
}
