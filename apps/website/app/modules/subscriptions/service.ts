import { fossilEventStore } from '~/modules/event-store/store.backend';
import { EventToWrite, IEventStore } from 'event-store';
import { v4 } from 'uuid';
import { SubscriptionCreated } from '~/modules/subscriptions/domain/events';

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
}
