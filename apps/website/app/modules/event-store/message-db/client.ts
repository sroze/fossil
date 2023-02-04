import { Pool } from 'pg';
import { context, propagation } from '@opentelemetry/api';
import { literal } from 'pg-format';
import { suppressTracing } from '@opentelemetry/core';

export class WrongExpectedVersionError extends Error {}

export type StreamEvent = {
  /* optional id for the event */
  id: string;
  type: string;
  data: any;
  metadata?: any;
};

export type TimelineEvent = {
  id: string;
  time: Date;
  type: string;
  data: any;
  metadata: any;
  stream_name: string;
  position: bigint;
  global_position: bigint;
};

export type AppendResult = {
  /* The new position of the stream */
  position: bigint;

  /* The new global order. Useful for cache busting  */
  global_position: bigint;
};

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
    messages: StreamEvent[],
    expectedVersion: bigint | null
  ) {
    const queryParts = ['BEGIN;'];
    for (let i = 0; i < messages.length; ++i) {
      const message = messages[i];
      const metadata = message.metadata || {};
      propagation.inject(context.active(), metadata);
      queryParts.push(sql`select *
                          from write_message(
                            ${message.id},
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
      const res: any = await context.with(
        suppressTracing(context.active()),
        () => client.query(queryParts.join('\n'))
      );
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

  async getStreamMessages(
    streamName: string,
    fromPosition = 0n,
    maxCount = 1000
  ): Promise<TimelineEvent[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_stream_messages($1, $2, $3)',
        [streamName, String(fromPosition), maxCount]
      );
      return result.rows.map(fromDb);
    } finally {
      client.release();
    }
  }

  async getLastStreamMessage(
    streamName: string
  ): Promise<TimelineEvent | undefined> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_last_stream_message($1)',
        [streamName]
      );
      return result.rows.map(fromDb)[0];
    } finally {
      client.release();
    }
  }

  async getCategoryMessages(
    category: string,
    fromPosition: bigint,
    maxCount = 1000
  ) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'select * from get_category_messages($1, $2, $3)',
        [category, String(fromPosition), maxCount]
      );
      return result.rows.map(fromDb);
    } finally {
      client.release();
    }
  }

  async getMaxCategoryPosition(category: string): Promise<bigint> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'select max(global_position) from messages where category(stream_name) = $1;',
        [category]
      );
      return BigInt(res.rows[0]?.max ?? -1);
    } finally {
      client.release();
    }
  }
}

function fromDb(row: any): TimelineEvent {
  return {
    id: row.id,
    stream_name: row.stream_name,
    time: new Date(row.time),
    type: row.type,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || 'null'),
    global_position: BigInt(row.global_position),
    position: BigInt(row.position),
  };
}
