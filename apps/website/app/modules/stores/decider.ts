import type { PrivateKey, PublicKey } from 'store-security';

// Events
export type StoreCreated = {
  id: string;
  name: string;
  region: 'london';
};

export type KeyGenerated = StoredKey;
export type KeyDeleted = {
  key_id: string;
};

export type Event =
  | { type: 'StoreCreated'; data: StoreCreated }
  | { type: 'KeyGenerated'; data: KeyGenerated }
  | { type: 'KeyDeleted'; data: KeyDeleted };

// Commands
export type CreateStoreCommand = {
  id: string;
  name: string;
  region: 'london';
};

type StoreGeneratedKeyCommand = {
  key: KeyGenerated;
};

// State
type StoredKey = {
  key_id: string;
  name: string;
  public_key: PublicKey;
} & ({ type: 'private' } | { type: 'hosted'; private_key: PrivateKey });

export type StoreState = {
  id: string;
  name: string;
  jwks: StoredKey[];
};

export type State = undefined | StoreState;

export const initialState: State = undefined;

export type Command =
  | { type: 'CreateStoreCommand'; data: CreateStoreCommand }
  | { type: 'StoreGeneratedKey'; data: StoreGeneratedKeyCommand }
  | { type: 'DeleteKey'; data: { key_id: string } };

export const evolve = (state: State, { type, data }: Event): State => {
  if (type === 'StoreCreated') {
    return {
      id: data.id,
      name: data.name,
      jwks: [],
    };
  } else if (!state) {
    throw new Error(`Store has not been created yet.`);
  }

  if (type === 'KeyGenerated') {
    if (!data.key_id || !data.public_key) {
      return state;
    }

    state.jwks.push({
      ...data,
    });
  } else if (type === 'KeyDeleted') {
    state.jwks = state.jwks.filter((key) => key.key_id !== data.key_id);
  }

  return state;
};

export const decide = (command: Command, state: State): Event[] => {
  if (command.type === 'CreateStoreCommand') {
    return state ? [] : [{ type: 'StoreCreated', data: command.data }];
  } else if (!state) {
    throw new Error(
      `Cannot send such a command on a store that does not exist.`
    );
  }

  if (command.type === 'StoreGeneratedKey') {
    return [{ type: 'KeyGenerated', data: { ...command.data.key } }];
  } else if (command.type === 'DeleteKey') {
    return [{ type: 'KeyDeleted', data: { ...command.data } }];
  }

  throw new Error(`Command is not supported.`);
};
