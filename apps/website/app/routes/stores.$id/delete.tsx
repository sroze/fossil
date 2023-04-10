import { ActionFunction, redirect } from '@remix-run/node';
import { actionWithAuthorization } from '~/modules/identity-and-authorization/remix-utils.server';
import { store } from '~/modules/stores/service';
import { pool } from '~/config.backend';
import sql from 'sql-template-tag';

export const action: ActionFunction = (args) =>
  actionWithAuthorization(args, async ({ params, request }) => {
    const store_id = params.id!;

    // get submitted form data:
    const body = await request.formData();
    if (!body.has('confirm')) {
      throw new Error('The deletion was not confirmed.');
    }

    // Can't delete is there are subscriptions
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

    // Delete the store
    await store(params.id!).write({
      type: 'DeleteStore',
      data: {},
    });

    return redirect(`/`);
  });
