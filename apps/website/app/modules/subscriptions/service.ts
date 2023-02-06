import { fossilEventStore } from '~/modules/event-store/store.backend';
import { IEventStore } from 'event-store';
import { v4 } from 'uuid';
import { SubscriptionCreated } from '~/modules/subscriptions/domain/events';

// Commands
type CreateSubscriptionCommand = {
  store_id: string;
  name: string;
  type: string;
};

export class DurableSubscriptionService {
  public static resolve(): DurableSubscriptionService {
    return new DurableSubscriptionService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {}

  async create(command: CreateSubscriptionCommand): Promise<string> {
    const identifier = v4();
    const created: SubscriptionCreated = {
      id: v4(),
      type: 'SubscriptionCreated',
      data: {
        ...command,
        subscription_id: identifier,
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
