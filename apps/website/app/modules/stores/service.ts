import { createAggregate } from '~/utils/ddd';
import { GeneratedKey, generateKey } from 'store-security';
import { v4 } from 'uuid';
import { fossilEventStore } from '~/config.backend';
import { AnyStoreCommand, decider, StoredKey } from './domain';

export const store = (id: string) => {
  const aggregate = createAggregate(fossilEventStore, decider);

  return {
    read: () => aggregate.read(`Store-${id}`),
    write: (command: AnyStoreCommand) =>
      aggregate.write({}, `Store-${id}`, command),
  };
};

export class StoreService {
  public static resolve(): StoreService {
    return new StoreService();
  }

  async execute(id: string, command: AnyStoreCommand) {
    return await store(id).write(command);
  }

  async load(identifier: string) {
    const { state } = await store(identifier).read();
    if (!state) {
      throw new Error('Store not found');
    }

    return state;
  }

  async createKey(
    id: string,
    data: { name: string; type: 'private' | 'hosted' }
  ): Promise<GeneratedKey> {
    const key = await generateKey();

    const storedKey: StoredKey =
      data.type === 'private'
        ? {
            key_id: v4(),
            name: data.name,
            public_key: key.public,
            type: 'private',
          }
        : {
            key_id: v4(),
            name: data.name,
            public_key: key.public,
            type: 'hosted',
            private_key: key.private,
          };

    await StoreService.resolve().execute(id, {
      type: 'StoreGeneratedKey',
      data: {
        key: storedKey,
      },
    });

    return key;
  }
}
