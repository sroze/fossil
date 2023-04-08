import { Pool } from 'pg';
import { IEventStore, StreamName } from 'event-store';
import {
  CheckpointAfterNMessages,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import {
  AnyInviteEvent,
  invitation,
} from '~/modules/organisations/invitations/domain';
import { organisation } from '~/modules/organisations/service';

export async function main(store: IEventStore, abortSignal: AbortSignal) {
  const subscription = new Subscription(
    store,
    new WithEventsCheckpointStore(store, 'InvitationAcceptedProcess-v1'),
    new CheckpointAfterNMessages(1)
  );

  await subscription.subscribeCategory<AnyInviteEvent>(
    'Invitation',
    async ({ data, type, stream_name }) => {
      const { identifier } = StreamName.decompose(stream_name);

      if (type === 'InviteAcceptedEvent') {
        const { state: invite } = await invitation(identifier).read();
        if (!invite) {
          throw new Error(`Invite not found`);
        }

        const { position } = await organisation(invite.org_id).write({
          type: 'AddMemberCommand',
          data: {
            user_id: data.user_id,
            role: invite.role,
          },
        });

        // Add feedback to the `invite`
        await invitation(identifier).write({
          type: 'MarkUserAddedToOrganisation',
          data: { org_version: position.toString() },
        });
      }
    },
    abortSignal
  );
}
