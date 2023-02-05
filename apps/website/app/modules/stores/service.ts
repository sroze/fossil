import { v4 } from 'uuid';
import { StoreCreated } from './domain/events';
import { Store } from './domain/store';
import { IEventStore } from '../event-store/interfaces';
import { accumulate } from '../event-store/accumulate';

// Commands
type CreateServiceCommand = {
  name: string;
  region: 'london';
};

export class StoreService {
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

    await this.client.appendEvents(`Store-${identifier}`, [created], -1n);

    return identifier;
  }

  async load(identifier: string): Promise<Store> {
    const events = await accumulate(
      this.client.readStream(`Store-${identifier}`, 0n)
    );

    // @ts-ignore don't worry!
    return new Store(events);
  }
}
