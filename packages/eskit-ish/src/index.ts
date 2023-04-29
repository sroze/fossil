import type {
  AppendResult,
  EventInStore,
  EventToWrite,
  IEventStore,
} from 'event-store';

export type Decider<S, E, C> = {
  /**
   * The empty state of the decider
   */
  initialState: S;
  /**
   * The evolution function. Given a current state and an event what should our next state be?
   * Combined with the initialState these make up the projection part of the decider
   */
  evolve: (state: S, event: E) => S;
  /**
   * The decision function. Given a command and current state, what decisions should be made?
   */
  decide: (command: C, state: S) => E[] | Promise<E[]>;
  /**
   * Optional but highly encouraged.
   * A terminal decider can make no more decisions and is a prime
   * candidate for archiving
   */
  isTerminal?: (state: S) => boolean;
};

export type DecisionContext = {
  /**
   * The user performing the action
   */
  userId?: string;
  /**
   * The id of the conversation (really only useful for processors)
   */
  $correlationId?: string;
  /**
   * The id of the preceding event in a conversation
   */
  $causationId?: string;
};

export type Writer<
  Command,
  Context extends DecisionContext = DecisionContext
> = (
  ctx: Context,
  streamName: string,
  command: Command
) => Promise<AppendResult>;

export type Reader<State> = (
  streamName: string
) => Promise<{ state: State; version: bigint }>;
export type Aggregate<
  State,
  Command,
  Context extends DecisionContext = DecisionContext
> = {
  read: Reader<State>;
  write: Writer<Command, Context>;
};

export type Codec<E> = {
  /**
   * Takes your domain event and formats it for storage in the event store.
   */
  encode: (value: E) => EventToWrite;
  /**
   * Takes a raw event stored in the event store and decodes it to your domain event.
   */
  decode: (value: EventInStore) => E | undefined;
};
export const identityCodec = <E>(): Codec<E> => ({
  encode: (v: E) => v as any as EventToWrite,
  decode: (v) => v as any as E,
});

/**
 * Creates a transact function that wires up the decider to a store using a codec
 *
 * @param store The event store
 * @param decider The decider
 * @param codec The codec. Events from the store will be encoded and decoded with this codec.
 */
export const createAggregate = <
  State,
  Event,
  Command,
  Context extends DecisionContext = DecisionContext
>(
  store: IEventStore,
  decider: Decider<State, Event, Command>,
  codec: Codec<Event> = identityCodec()
): Aggregate<State, Command, Context> => {
  const read: Reader<State> = async (streamName: string) => {
    let state = decider.initialState;
    let version = -1n;
    for await (const event of store.readStream(streamName)) {
      const decoded = codec.decode(event);
      if (decoded != null) {
        state = decider.evolve(state, decoded);
      }
      version = event.position;
    }

    return { version, state };
  };

  const write: Writer<Command, Context> = async (ctx, streamName, command) => {
    const { version, state } = await read(streamName);
    if (version !== -1n && decider.isTerminal?.(state)) {
      throw new Error(
        `Stream is terminal. ${streamName} cannot accept new decisions`
      );
    }

    const events = await decider.decide(command, state);
    const eventsToAppend = events.map((ev) => {
      const encoded = codec.encode(ev);
      return {
        id: encoded.id,
        type: encoded.type,
        data: encoded.data,
        metadata: Object.assign({}, ctx, encoded.metadata),
      };
    });

    return store.appendEvents(streamName, eventsToAppend, version);
  };

  return { write, read };
};

const exponentialBackoff = (attempt: number) =>
  Math.random() * 1000 * attempt ** 2;

/**
 * Adds a retry mechanism on top of a transact function
 * Will retry {maxAttempt} times before giving up
 * @param transact
 * @param maxAttempts defaults to 3
 * @param backoffStrategy Defaults to exponential with full jitter
 */
export const withRetry =
  <T>(
    transact: Writer<T>,
    maxAttempts = 3,
    backoffStrategy = exponentialBackoff
  ): Writer<T> =>
  (ctx, id, cmd) => {
    const attemptSync = async (attempt: number): Promise<AppendResult> => {
      try {
        return await transact(ctx, id, cmd);
      } catch (err) {
        if (attempt > maxAttempts) throw err;
        await new Promise((res) => setTimeout(res, backoffStrategy(attempt)));
        return attemptSync(attempt + 1);
      }
    };
    return attemptSync(1);
  };
