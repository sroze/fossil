import { pool } from '~/config.backend';
import { StoreApi } from 'fossil-api-client';
import sql from 'sql-template-tag';
import { storeApiBaseUrl } from '~/modules/api-client/config';
import axios from 'axios';

export async function getAuthenticatedStoreApi(id: string): Promise<StoreApi> {
  const {
    rows: [{ management_token }],
  } = await pool.query(
    sql`SELECT management_token FROM stores WHERE store_id = ${id}`
  );
  if (!management_token) {
    throw new Error(`Store not found`);
  }

  return new StoreApi(
    undefined,
    storeApiBaseUrl,
    axios.create({
      headers: {
        authorization: `Bearer ${management_token}`,
      },
    })
  );
}
