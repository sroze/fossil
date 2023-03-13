import { Pool } from 'pg';
import { KeyLocator, PublicKey } from 'store-security';
import sql from 'sql-template-tag';

export class DatabaseKeyLocator implements KeyLocator {
  constructor(private readonly pool: Pool) {}

  async findPublicKey(
    storeId: string,
    keyId: string,
  ): Promise<PublicKey | undefined> {
    const { rows } = await this.pool.query<{ public_key: PublicKey }>(
      sql`SELECT public_key FROM public_keys WHERE store_id = ${storeId} AND public_key_kid = ${keyId}`,
    );

    if (rows.length === 0) {
      return undefined;
    }

    return rows[0].public_key;
  }
}
