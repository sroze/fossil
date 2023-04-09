import type { Decider } from '~/utils/ddd';
import { Auth0Profile } from 'remix-auth-auth0';
import {
  authenticator,
  sessionStorage,
} from '~/modules/identity-and-authorization/authenticator.server';

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

export async function authenticatedAsUser(
  request: Request,
  profile: Auth0Profile
): Promise<Request> {
  let session = await sessionStorage.getSession();
  session.set(authenticator.sessionKey, profile);

  request.headers.set('Cookie', await sessionStorage.commitSession(session));

  return request;
}
