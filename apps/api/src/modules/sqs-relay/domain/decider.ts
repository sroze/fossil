import { AnySQSTargetEvent } from './events';
import { AnySqsRelayCommand } from './commands';
import { Aggregate } from '../../../utils/eskit-nest';
import { SqsRelay } from './category';

export interface State {
  subscription_id: string;
  sqs_queue_url?: string;
}

export const aggregate: Aggregate<
  State | undefined,
  AnySQSTargetEvent,
  AnySqsRelayCommand
> = {
  symbol: Symbol('SqsRelay'),
  category: SqsRelay,
  decider: {
    initialState: undefined,
    evolve: (state, { type, data }) => {
      if (type === 'SQSRelayCreated') {
        return {
          subscription_id: data.subscription_id,
        };
      } else if (state === undefined) {
        throw new Error(`Cannot evolve state as it does not exist`);
      }

      if (type === 'SQSQueueCreated') {
        state.sqs_queue_url = data.sqs_queue_url;
      }

      return state;
    },
    decide: ({ type, data }, state) => {
      if (type === 'CreateSqsRelay') {
        return [
          {
            type: 'SQSRelayCreated',
            data: {
              subscription_id: data.subscription_id,
            },
          },
          data.sqs_queue_url
            ? {
                type: 'SQSQueueCreated',
                data: {
                  sqs_queue_url: data.sqs_queue_url,
                },
              }
            : {
                type: 'SQSQueueRequested',
                data: {},
              },
        ];
      } else if (state === undefined) {
        throw new Error(`Cannot decide as state does not exist`);
      }

      if (type === 'MarkSqsQueueAsCreated') {
        return [
          {
            type: 'SQSQueueCreated',
            data: {
              sqs_queue_url: data.sqs_queue_url,
            },
          },
        ];
      }

      return [];
    },
  },
};
