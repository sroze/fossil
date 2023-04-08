import { ActionFunction } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import {
  AnyInviteEvent,
  invitation,
} from '~/modules/organisations/invitations/domain';
import {
  CheckpointAfterNMessages,
  InMemoryCheckpointStore,
  Subscription,
} from 'subscription';
import { fossilEventStore } from '~/config.backend';
import { IEventStore, MinimumEventType } from 'event-store';

async function subscribeUntil<EventType extends MinimumEventType, ReturnType>(
  eventStore: IEventStore,
  streamName: string,
  position: bigint,
  predicate: (event: EventType) => ReturnType | undefined,
  atMost: number
): Promise<ReturnType | undefined> {
  const controller = new AbortController();
  const subscription = new Subscription(
    eventStore,
    new InMemoryCheckpointStore(position),
    new CheckpointAfterNMessages(1)
  );

  // Start the timer
  const timeout = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, atMost);

  let lastResult: ReturnType | undefined;
  try {
    await subscription.subscribeStream<EventType>(
      streamName,
      async (event) => {
        lastResult = predicate(event);

        if (lastResult) {
          controller.abort();
        }
      },
      controller.signal
    );
  } finally {
    clearTimeout(timeout);
  }

  return lastResult;
}

export type SuccessfullyAcceptedInviteResponse = {
  org_id: string;
  org_version: string;
};

export const action: ActionFunction = (args) =>
  actionWithAuthorization<SuccessfullyAcceptedInviteResponse>(
    args,
    async ({ params, profile: loggedInUser }) => {
      const invitation_id = params.id!;
      const { state: invite } = await invitation(invitation_id).read();
      if (!invite) {
        throw new Error(`Invite not found.`);
      }

      await invitation(invitation_id).write({
        type: 'AcceptInviteCommand',
        data: {
          user_id: loggedInUser.id,
          user_email: loggedInUser.email,
        },
      });

      const added = await subscribeUntil(
        fossilEventStore,
        `Invitation-${invitation_id}`,
        -1n, // we are going through the whole history, it's fine if it was added by a previous command.
        (event: AnyInviteEvent) =>
          event.type === 'UserAddedToOrganisation' ? event : undefined,
        2_000 // 2 seconds
      );

      if (!added) {
        throw new Error(
          'It took too long to add the user to the organisation. Please try again later.'
        );
      }

      return {
        org_id: invite.org_id,
        org_version: added.data.org_version,
      };
    }
  );
