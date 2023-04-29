import { ActionFunction, redirect } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';
import { organisation } from '~/modules/organisations/service';

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ params, request }) => {
    const store_id = params.id!;

    // get submitted form data:
    const body = await request.formData();
    if (!body.has('confirm')) {
      throw new Error('The deletion was not confirmed.');
    }

    // Can't delete if there are subscriptions
    const {
      rows: [{ count }],
    } = await pool.query<{ count: string }>(
      sql`SELECT count(*) FROM subscriptions WHERE store_id = ${store_id}`
    );

    if (count !== '0') {
      throw new Error(
        `There are still ${count} subscriptions. Delete them first.`
      );
    }

    // Get the organisation
    const {
      rows: [{ org_id }],
    } = await pool.query<{ org_id: string }>(
      sql`SELECT org_id FROM stores WHERE store_id = ${store_id}`
    );
    if (!org_id) {
      throw new Error(`Store not found`);
    }

    await organisation(org_id).write({
      type: 'ArchiveStore',
      data: {
        store_id,
      },
    });

    return redirect(`/`);
  });
