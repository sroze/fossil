import { v4 } from 'uuid';
import { organisation } from '~/modules/organisations/service';
import { runUntilEof } from '~/utils/subscription';
import { fossilEventStore, pool } from '~/config.backend';
import { loader } from './orgs.$id';
import { authenticatedAsUser } from '~/utils/testing';
import { factory as orgsFactory } from '~/read-models/orgs';
import * as identityResolver from '~/modules/identity-and-authorization/identity-resolver.server';

// We have a user, yay.
jest
  .spyOn(identityResolver, 'profileFromUserIdentifier')
  .mockImplementation(async (id) => {
    return {
      id,
      email: 'me@example.com',
      displayName: 'Me',
    };
  });

describe('orgs.$id', () => {
  const orgId = v4();
  const userInOrganisation = v4();

  beforeAll(async () => {
    // Create the organisation.
    await organisation(orgId).write({
      type: 'CreateOrganisationCommand',
      data: {
        name: 'Foo',
        created_by: userInOrganisation,
      },
    });

    // Run the necessary projection.
    await runUntilEof(orgsFactory(fossilEventStore, pool), 1000);
  });

  it('redirects an unauthenticated user to the login page', async () => {
    const request = new Request(`http://localhost:8080/orgs/${orgId}`);

    expect.assertions(3);

    try {
      await loader({ request, params: { id: orgId }, context: {} });
    } catch (e) {
      expect(e).toBeInstanceOf(Response);

      const response = e as Response;
      expect(response.status).toEqual(302);
      expect(response.headers.get('location')).toEqual(`/auth/login`);
    }
  });

  it('refuses access to a user not in the organisation', async () => {
    const request = await authenticatedAsUser(
      new Request(`http://localhost:8080/orgs/${orgId}`),
      {
        id: v4(),
        emails: [{ value: 'another-user@example.com' }],
        name: { familyName: 'Some', givenName: 'Body' },
        provider: 'auth0',
      }
    );

    expect.assertions(2);

    try {
      await loader({ request, params: { id: orgId }, context: {} });
    } catch (e) {
      expect(e).toBeInstanceOf(Response);

      const response = e as Response;
      expect(response.status).toEqual(404);
    }
  });

  it('renders the organisation page for a user in the organisation', async () => {
    const request = await authenticatedAsUser(
      new Request(`http://localhost:8080/orgs/${orgId}`),
      {
        id: userInOrganisation,
        emails: [{ value: 'me@example.com' }],
        name: { familyName: 'Sam', givenName: 'Roze' },
        provider: 'auth0',
      }
    );

    const response: Response = await loader({
      request,
      params: { id: orgId },
      context: {},
    });

    expect(response.status).toEqual(200);
    const body = await response.json();
    expect(body.org_id).toEqual(orgId);
  });
});
