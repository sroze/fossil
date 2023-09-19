import { pool } from '~/config.backend';
import sql from 'sql-template-tag';

type PermissionOnStoreMetadata = PermissionOnOrgMetadata & {
  store_id: string;
  store_name: string;
};

export async function assertPermissionOnStore(
  storeId: string,
  userId: string
): Promise<PermissionOnStoreMetadata> {
  const {
    rows: [data],
  } = await pool.query<PermissionOnStoreMetadata>(
    sql`SELECT s.store_id, s.name as store_name, o.org_id, o.name as org_name
          FROM users_in_orgs uio
          INNER JOIN stores s ON s.org_id = uio.org_id
          INNER JOIN orgs o ON o.org_id = s.org_id
          WHERE s.store_id = ${storeId} AND uio.user_id = ${userId}`
  );

  if (!data) {
    throw new Response('Not found', { status: 404 });
  }

  return data;
}

type PermissionOnOrgMetadata = {
  org_id: string;
  org_name: string;
};

export async function assertPermissionOnOrg(
  orgId: string,
  userId: string
): Promise<PermissionOnOrgMetadata> {
  const {
    rows: [data],
  } = await pool.query<PermissionOnOrgMetadata>(
    sql`SELECT o.org_id, o.name as org_name
          FROM users_in_orgs uio
          INNER JOIN orgs o ON o.org_id = uio.org_id
          WHERE uio.org_id = ${orgId} AND uio.user_id = ${userId}`
  );

  if (!data) {
    throw new Response('Not found', { status: 404 });
  }

  return data;
}
