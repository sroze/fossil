import { action } from './accept';
import { v4 } from 'uuid';
import { organisation } from '~/modules/organisations/service';
import { invitation } from '~/modules/organisations/invitations/domain';
import { Response } from '@remix-run/node';
import { main as invitationAccepted } from '~/modules/organisations/invitations/processes/add-user-when-invite-is-accepted';
import { fossilEventStore } from '~/config.backend';
import { authenticatedAsUser } from '~/utils/testing';

const abortController = new AbortController();

describe('POST /api/invitations/:id/accept', () => {
  const me = v4();
  let org_id: string;

  beforeAll(async () => {
    org_id = v4();

    // Start the processes
    void invitationAccepted(fossilEventStore, abortController.signal).catch(
      console.error
    );

    // Create the organisation.
    await organisation(org_id).write({
      type: 'CreateOrganisationCommand',
      data: {
        name: 'Foo',
        created_by: me,
      },
    });
  });

  afterAll(() => {
    abortController.abort();
  });

  describe('when the invite does exist', () => {
    let invite_id: string;

    beforeAll(async () => {
      invite_id = v4();

      // Create the invite.
      await invitation(invite_id).write({
        type: 'CreateInviteCommand',
        data: {
          org_id,
          invited_role: 'admin',
          invited_by: me,
          invited_email: 'foo@example.com',
        },
      });
    });

    it('returns the org id and version when successful', async () => {
      const request = await authenticatedAsUser(
        new Request(`http://localhost:8080/invitations/${invite_id}/accept`, {
          method: 'POST',
          body: null,
        }),
        {
          id: me,
          emails: [{ value: 'foo@example.com' }],
          name: { familyName: 'Sam', givenName: 'Roze' },
          provider: 'auth0',
        }
      );

      const response: Response = await action({
        request,
        params: {
          id: invite_id,
        },
        context: {},
      });

      expect(response.status).toEqual(302);
      expect(response.headers.get('location')).toEqual(`/orgs/${org_id}`);
    });
  });
});
