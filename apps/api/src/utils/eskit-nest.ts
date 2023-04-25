import { Category, IEventStore } from 'event-store';
import { createAggregate, Decider } from 'eskit-ish';

export interface Aggregate<State, Events, Commands> {
  symbol: symbol;
  decider: Decider<State, Events, Commands>;
  category: Category;
}

type inferredDecider<A> = A extends Aggregate<infer S, infer E, infer C>
  ? Decider<S, E, C>
  : never;

type inferredStateFromDecider<A> = A extends Decider<infer S, infer E, infer C>
  ? S
  : never;
type inferredCommandsFromDecider<A> = A extends Decider<
  infer S,
  infer E,
  infer C
>
  ? C
  : never;

export class EskitService<A extends Aggregate<any, any, any>> {
  constructor(
    private readonly store: IEventStore,
    private readonly decider: inferredDecider<A>,
    private readonly category: Category,
  ) {}

  async readOrFail(id: string): Promise<{
    state: inferredStateFromDecider<inferredDecider<A>>;
    version: bigint;
  }> {
    const { state, version } = await createAggregate(
      this.store,
      this.decider,
    ).read(this.category.stream(id));

    if (!state) {
      throw new Error(`Relay was not found`);
    }

    return { state, version };
  }

  execute(
    id: string,
    command: inferredCommandsFromDecider<inferredDecider<A>>,
  ) {
    return createAggregate(this.store, this.decider).write(
      {},
      this.category.stream(id),
      command,
    );
  }
}
