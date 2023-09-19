import {
  ICheckpointStore,
  Subscription,
  WithEventsCheckpointStore,
} from 'subscription';
import { IEventStore, StreamName } from 'event-store';
import sql from 'sql-template-tag';
import { Pool } from 'pg';
import { AnyOrganisationEvent, Role } from '~/modules/organisations/events';
import { profileFromUserIdentifier } from '~/modules/identity-and-authorization/identity-resolver.server';
import { RunnableSubscription } from '~/utils/subscription';

export function factory(
  store: IEventStore,
  pool: Pool
): RunnableSubscription<AnyOrganisationEvent> & {
  checkpointStore: ICheckpointStore;
} {
  const checkpointStore = new WithEventsCheckpointStore(
    store,
    'OrgsReadModel-v4'
  );

  return {
    checkpointStore,
    subscription: new Subscription(
      store,
      { category: 'Organisation' },
      {
        checkpointStore,
      }
    ),
    handler: async ({ data, type, stream_name, global_position }) => {
      const { identifier } = StreamName.decompose(stream_name);

      const addUserToOrg = async (user_id: string, role: Role) => {
        const profile = await profileFromUserIdentifier(user_id);

        await pool.query(
          sql`INSERT INTO profiles (user_id, name, email)
              VALUES (${user_id}, ${profile.displayName}, ${profile.email})
              ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`
        );

        await pool.query(
          sql`INSERT INTO users_in_orgs (org_id, user_id, role)
              VALUES (${identifier}, ${user_id}, ${role})
              ON CONFLICT DO NOTHING`
        );
      };

      if (type === 'OrganisationCreated') {
        await pool.query(
          sql`INSERT INTO orgs (org_id, name)
            VALUES (${identifier}, ${data.name})
            ON CONFLICT DO NOTHING`
        );

        await addUserToOrg(data.created_by, 'admin');
      } else if (type === 'UserJoinedOrganisation') {
        await addUserToOrg(data.user_id, data.role);
      } else if (type === 'UserLeftOrganisation') {
        await pool.query(
          sql`DELETE FROM users_in_orgs
              WHERE org_id = ${identifier} AND user_id = ${data.user_id}`
        );
      } else if (type === 'OrganisationDeleted') {
        await pool.query(sql`DELETE FROM orgs WHERE org_id = ${identifier}`);
      } else if (type === 'StoreCreated') {
        await pool.query(
          sql`INSERT INTO stores (store_id, org_id, name, management_token, last_known_checkpoint)
              VALUES (${data.store_id}, ${identifier}, ${data.name}, ${
            data.management_token
          }, ${String(global_position)}) ON CONFLICT (store_id) DO
          UPDATE
            SET name = EXCLUDED.name,
            org_id = EXCLUDED.org_id,
            last_known_checkpoint = EXCLUDED.last_known_checkpoint,
            management_token = EXCLUDED.management_token`
        );
      } else if (type === 'StoreArchived') {
        await pool.query(
          sql`DELETE FROM stores WHERE store_id = ${data.store_id} AND org_id = ${identifier}`
        );
      }
    },
  };
}
