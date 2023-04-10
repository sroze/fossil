import { EventToWrite, IEventStore } from 'event-store';
import { v4 } from 'uuid';
import {
  SubscriptionCreated,
  SubscriptionDeleted,
} from '~/modules/subscriptions/domain/events';
import { fossilEventStore } from '~/config.backend';

// Commands
type CreateSubscriptionCommand = {
  store_id: string;
  category: string;
  name: string;
};

export class DurableSubscriptionService {
  public static resolve(): DurableSubscriptionService {
    return new DurableSubscriptionService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {}

  async create(command: CreateSubscriptionCommand): Promise<string> {
    const identifier = v4();
    const created: EventToWrite<SubscriptionCreated> = {
      id: v4(),
      type: 'SubscriptionCreated',
      data: {
        ...command,
        type: 'managed-queue',
      },
    };

    await this.client.appendEvents(
      `Subscription-${identifier}`,
      [created],
      -1n
    );

    return identifier;
  }

  async delete(identifier: string): Promise<void> {
    await this.client.appendEvents<SubscriptionDeleted>(
      `Subscription-${identifier}`,
      [{ id: v4(), type: 'SubscriptionDeleted', data: {} }],
      null
    );
  }
}
