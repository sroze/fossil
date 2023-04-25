import { Aggregate } from '../../../utils/eskit-nest';
import { Subscription } from './category';
import { AnySubscriptionEvent } from './events';
import { AnySubscriptionCommand } from './commands';

type State = {
  store_id: string;
  category: string;
};

export const aggregate: Aggregate<
  State | undefined,
  AnySubscriptionEvent,
  AnySubscriptionCommand
> = {
  symbol: Symbol('DurableSubscription'),
  category: Subscription,
  decider: {
    initialState: undefined,
    evolve: (state, { type, data }) => {
      if (type === 'SubscriptionCreated') {
        return {
          store_id: data.store_id,
          category: data.category,
        };
      } else if (state === undefined) {
        throw new Error(`Cannot evolve state as it does not exist`);
      }

      return state;
    },
    decide: ({ type, data }, state) => {
      if (state === undefined) {
        if (type === 'CreateSubscription') {
          return [
            {
              type: 'SubscriptionCreated',
              data: {
                store_id: data.store_id,
                category: data.category,
                name: data.name,
              },
            },
          ];
        } else {
          throw new Error(`Cannot decide as state does not exist`);
        }
      }

      if (type === 'DeleteSubscription') {
        return [
          {
            type: 'SubscriptionDeleted',
            data: {},
          },
        ];
      }

      return [];
    },
  },
};
