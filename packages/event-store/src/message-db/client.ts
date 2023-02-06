import type { Pool } from 'pg';
import { literal } from 'pg-format';
import { v4 } from 'uuid';
import { AppendResult, EventToWrite, EventInStore } from '../interfaces';

export class WrongExpectedVersionError extends Error {}

const sql = (parts: TemplateStringsArray, ...values: any[]) => {
  let text = '';
  for (let i = 0; i < parts.length; ++i) {
    text += parts[i] + (i >= values.length ? '' : literal(values[i]));
  }
  return text;
};

export class MessageDbClient {
  constructor(private readonly pool: Pool) {}

  async writeMessages(
    streamName: string,
    messages: EventToWrite[],
    expectedVersion: bigint | null
  ): Promise<AppendResult> {
    const queryParts = ['BEGIN;'];
    for (let i = 0; i < messages.length; ++i) {
      const message = messages[i];
      const metadata = message.metadata || {};
      queryParts.push(sql`select *
                          from write_message(
                            ${message.id || v4()},
                            ${streamName},
                            ${message.type},
                            ${JSON.stringify(message.data)},
                            ${JSON.stringify(metadata || 'null')},
                            ${
                              expectedVersion == null
                                ? null
                                : Number(expectedVersion++)
                            });`);
    }
    queryParts.push(
      sql`select global_position, position
          from get_last_stream_message(${streamName});`
    );
    queryParts.push('COMMIT;');

    const client = await this.pool.connect();
    try {
      // There is a risk of leaking sensitive data to data dog if
      // the pg instrumentation is allowed to display the query
      // as it is not parameterised for performance reasons
      //
      // The any type is here because the PG types don't document that when you
      // give it multiple statements you get back an array of results
      const res: any = await client.query(queryParts.join('\n'));
      const lastMessage = res[res.length - 2]?.rows?.[0];
      return {
        position: BigInt(lastMessage?.position ?? -1n),
        global_position: BigInt(lastMessage?.global_position ?? -1n),
      };
    } catch (err: any) {
      await client.query('ROLLBACK;');
      if (err?.message?.startsWith('Wrong expected version: ')) {
        throw new WrongExpectedVersionError(err.message);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async getStreamMessages<EventType extends EventInStore = EventInStore>(
    streamName: string,
    fromPosition: bigint,
    maxCount: number
  ): Promise<EventType[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_stream_messages($1, $2, $3)',
        [streamName, String(fromPosition), maxCount]
      );
      return result.rows.map(fromDb<EventType>);
    } finally {
      client.release();
    }
  }

  async getCategoryMessages<EventType extends EventInStore = EventInStore>(
    category: string,
    fromPosition: bigint,
    maxCount: number
  ): Promise<EventType[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_category_messages($1, $2, $3)',
        [category, String(fromPosition), maxCount]
      );
      return result.rows.map(fromDb<EventType>);
    } finally {
      client.release();
    }
  }

  async getLastStreamMessage<EventType extends EventInStore = EventInStore>(
    streamName: string,
    type?: string
  ): Promise<EventType | undefined> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_last_stream_message($1, $2)',
        [streamName, type || null]
      );
      return result.rows.map(fromDb<EventType>)[0];
    } finally {
      client.release();
    }
  }
}

function fromDb<T extends EventInStore = EventInStore>(row: any): T {
  return {
    id: row.id,
    stream_name: row.stream_name,
    time: new Date(row.time),
    type: row.type,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || 'null'),
    global_position: BigInt(row.global_position),
    position: BigInt(row.position),
  } as T;
}
