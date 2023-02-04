import { MessageDbClient } from '../event-store/message-db/client';
import { v4 } from 'uuid';
import { StoreCreated } from './events';
import { Store } from './store';

// Commands
type CreateServiceCommand = {
  name: string;
  region: 'london';
};

export class StoreService {
  constructor(private readonly client: MessageDbClient) {}

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

    await this.client.writeMessages(`Store-${identifier}`, [created], -1n);

    return identifier;
  }

  async load(identifier: string): Promise<Store> {
    const events = await this.client.getStreamMessages(
      `Store-${identifier}`,
      0n,
      1000
    );
    if (events.length == 1000) {
      throw new Error(`You've done a lot, talk to our support team.`);
    }

    // @ts-ignore don't worry!
    return new Store(events);
  }
}
