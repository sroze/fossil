import type { Decider } from '~/utils/ddd';

export function given<S, E, C>(decider: Decider<S, E, C>, events: E[]) {
  function evolveMany(state: S, events: E[]) {
    return events.reduce((state, event) => decider.evolve(state, event), state);
  }

  const state = evolveMany(decider.initialState, events);

  return {
    state,
    when(command: C) {
      const events = decider.decide(command, state);

      return { events, state: evolveMany(state, events) };
    },
  };
}
