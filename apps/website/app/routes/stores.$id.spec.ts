import { loader } from './stores.$id';
import { v4 } from 'uuid';
import { authenticatedAsUser } from '~/utils/testing';
import { organisation } from '~/modules/organisations/service';
// import { store } from '~/modules/stores/service';
import { factory as orgsFactory } from '~/read-models/orgs';
import { fossilEventStore, pool } from '~/config.backend';
import { runUntilEof } from '~/utils/subscription';
import * as identityResolver from '~/modules/identity-and-authorization/identity-resolver.server';
import { cookieContentForCheckpoint } from '~/utils/eventual-consistency';
import { sleep } from 'subscription';

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

describe('stores.$id', () => {
  const orgId = v4();
  const storeId = v4();
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

    // create the store.
    await store(storeId).write({
      type: 'CreateStoreCommand',
      data: {
        id: storeId,
        name: 'Foo',
        owning_org_id: orgId,
      },
    });

    // Runs the necessary projections.
    await Promise.all([
      runUntilEof(orgsFactory(fossilEventStore, pool), 1000),
      // runUntilEof(storeFactory(fossilEventStore, pool), 1000),
    ]);
  });

  it('redirects an unauthenticated user to the login page', async () => {
    const request = new Request(`http://localhost:8080/stores/${storeId}`);

    expect.assertions(3);

    try {
      await loader({ request, params: { id: storeId }, context: {} });
    } catch (e) {
      expect(e).toBeInstanceOf(Response);

      const response = e as Response;
      expect(response.status).toEqual(302);
      expect(response.headers.get('location')).toEqual(`/auth/login`);
    }
  });

  it('returns an error if the logged-in user does not have the permissions', async () => {
    const request = await authenticatedAsUser(
      new Request(`http://localhost:8080/stores/${storeId}`),
      {
        id: v4(),
        emails: [{ value: 'another-user@example.com' }],
        name: { familyName: 'Some', givenName: 'Body' },
        provider: 'auth0',
      }
    );

    expect.assertions(2);

    try {
      await loader({ request, params: { id: storeId }, context: {} });
    } catch (e) {
      expect(e).toBeInstanceOf(Response);

      const response = e as Response;
      expect(response.status).toEqual(404);
    }
  });

  it('returns the store and organisation names if user is granted', async () => {
    const request = await authenticatedAsUser(
      new Request(`http://localhost:8080/stores/${storeId}`),
      {
        id: userInOrganisation,
        emails: [{ value: 'me@example.com' }],
        name: { familyName: 'Sam', givenName: 'Roze' },
        provider: 'auth0',
      }
    );

    const response: Response = await loader({
      request,
      params: { id: storeId },
      context: {},
    });

    expect(response.status).toEqual(200);
    const body = await response.json();
    expect(body.org_id).toEqual(orgId);
    expect(body.store_id).toEqual(storeId);
  });

  it('waits for the projection to have caught up if checkpoint cookie is provided', async () => {
    // Create a new organisation.
    const newStoreId = v4();
    const { global_position } = await store(newStoreId).write({
      type: 'CreateStoreCommand',
      data: {
        id: newStoreId,
        name: 'Foo',
        owning_org_id: orgId,
      },
    });

    const request = await authenticatedAsUser(
      new Request(`http://localhost:8080/stores/${newStoreId}`, {
        headers: {
          cookie: await cookieContentForCheckpoint({
            global_position,
          }),
        },
      }),
      {
        id: userInOrganisation,
        emails: [{ value: 'me@example.com' }],
        name: { familyName: 'Sam', givenName: 'Roze' },
        provider: 'auth0',
      }
    );

    const responsePromise: Promise<Response> = loader({
      request,
      params: { id: newStoreId },
      context: {},
    });

    await sleep(50);
    // await runUntilEof(storeFactory(fossilEventStore, pool), 1000);

    const response = await responsePromise;
    expect(response.status).toEqual(200);
  });
});
