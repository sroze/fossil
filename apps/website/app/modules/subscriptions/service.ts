import { IEventStore } from 'event-store';
import { v4 } from 'uuid';
import { SubscriptionDeleted } from '~/modules/subscriptions/domain/events';
import { fossilEventStore } from '~/config.backend';

export class DurableSubscriptionService {
  public static resolve(): DurableSubscriptionService {
    return new DurableSubscriptionService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {}

  async delete(identifier: string): Promise<void> {
    await this.client.appendEvents<SubscriptionDeleted>(
      `Subscription-${identifier}`,
      [{ id: v4(), type: 'SubscriptionDeleted', data: {} }],
      null
    );
  }
}
