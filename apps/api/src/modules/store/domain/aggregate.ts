import { Aggregate } from '../../../utils/eskit-nest';
import { AnyStoreEvent } from './events';
import { AnyStoreCommand } from './commands';
import { Category } from 'event-store';
import type { PrivateKey, PublicKey } from 'store-security';
import { generateKey } from 'store-security';
import { v4 } from 'uuid';

export const Store = new Category('Store');

type State = {
  name: string;
  management_key?: PrivateKey;
  jwks: Record<string, { public_key: PublicKey; private_key?: PrivateKey }>;
};

export const aggregate: Aggregate<
  State | undefined,
  AnyStoreEvent,
  AnyStoreCommand
> = {
  symbol: Symbol('Store'),
  category: Store,
  decider: {
    initialState: undefined,
    evolve: (state, { type, data }) => {
      if (type === 'StoreCreated') {
        return {
          name: data.name,
          jwks: {},
        };
      } else if (state === undefined) {
        throw new Error(`Cannot evolve state as it does not exist`);
      } else if (type === 'StoreDeleted') {
        return undefined;
      }

      if (type === 'KeyCreated') {
        state.jwks[data.key_id] = {
          public_key: data.public_key,
          private_key: data.private_key,
        };

        if (data.name === 'Management Key') {
          state.management_key = data.private_key;
        }
      } else if (type === 'KeyDeleted') {
        delete state.jwks[data.key_id];
      }

      return state;
    },
    decide: async ({ type, data }, state) => {
      if (type === 'CreateStore') {
        if (state === undefined) {
          const key = await generateKey();
          const managementKeyId = v4();

          return [
            {
              type: 'StoreCreated',
              data,
            },
            {
              type: 'KeyCreated',
              data: {
                key_id: managementKeyId,
                name: 'Management Key',
                private_key: key.private,
                public_key: key.public,
              },
            },
          ];
        } else {
          throw new Error(`Cannot decide as the store already exists.`);
        }
      } else if (state === undefined) {
        throw new Error(`Cannot decide as state does not exist.`);
      }

      if (type === 'DeleteStore') {
        return [
          {
            type: 'StoreDeleted',
            data,
          },
        ];
      }

      if (type === 'CreateKey' && !(data.key_id in state.jwks)) {
        return [
          {
            type: 'KeyCreated',
            data,
          },
        ];
      } else if (type === 'DeleteKey' && data.key_id in state.jwks) {
        return [
          {
            type: 'KeyDeleted',
            data,
          },
        ];
      }

      return [];
    },
  },
};
