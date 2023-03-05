import { IEventStore } from 'event-store';
import { fossilEventStore } from '../event-store/store.backend';
import { Aggregate, createAggregate, Writer } from '~/utils/ddd';
import * as Decider from './decider';
import { Command, State, StoreState } from './decider';
import { GeneratedKey, generateKey } from 'store-security';
import { v4 } from 'uuid';

// TODO: Add `users` to stores, who have access to these stores.
// TODO: Create a read-model that has the list of stores per user.

export class StoreService {
  private readonly aggregate: Aggregate<State, Command>;

  public static resolve(): StoreService {
    return new StoreService(fossilEventStore);
  }

  constructor(private readonly client: IEventStore) {
    this.aggregate = createAggregate(client, Decider);
  }

  async execute(id: string, command: Command) {
    return await this.aggregate.write({}, `Store-${id}`, command);
  }

  async load(identifier: string): Promise<StoreState> {
    const { state } = await this.aggregate.read(`Store-${identifier}`);
    if (!state) {
      throw new Error(`Unable to find store.`);
    }

    return state;
  }

  async createKey(
    id: string,
    data: { name: string; type: 'private' | 'hosted' }
  ): Promise<GeneratedKey> {
    const key = await generateKey();
    const r = await StoreService.resolve().execute(id, {
      type: 'StoreGeneratedKey',
      data: {
        key: {
          key_id: v4(),
          name: data.name,
          type: data.type,
          public_key: key.public,
          // @ts-expect-error we need to be better at typing this one.
          private_key: data.type === 'hosted' ? key.private : undefined,
        },
      },
    });

    console.log('r', r);

    return key;
  }
}
