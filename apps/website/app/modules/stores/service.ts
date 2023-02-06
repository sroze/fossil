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

// Commands
type CreateServiceCommand = {
  name: string;
  region: 'london';
};

export class StoreService {
  public static resolve(): StoreService {
    return new StoreService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {}

  async create(command: CreateServiceCommand): Promise<string> {
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
