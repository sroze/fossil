import type { Pool } from 'pg';
import { literal } from 'pg-format';
import { v4 } from 'uuid';
import {
  AppendResult,
  EventInStore,
  EventToWrite,
  MinimumEventType,
  StatisticsAtPosition,
  WrongExpectedVersionError,
} from '../interfaces';
import { prefixFromCategory } from './prefix';

const sql = (parts: TemplateStringsArray, ...values: any[]) => {
  let text = '';
  for (let i = 0; i < parts.length; ++i) {
    text += parts[i] + (i >= values.length ? '' : literal(values[i]));
  }
  return text;
};

export class MessageDbClient {
  constructor(private readonly pool: Pool) {}

  async writeMessages<EventType extends MinimumEventType>(
    streamName: string,
    messages: EventToWrite<EventType>[],
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

  async getStreamMessages<EventType extends MinimumEventType>(
    streamName: string,
    fromPosition: bigint,
    maxCount: number
  ): Promise<EventInStore<EventType>[]> {
    const result = await this.pool.query(
      'select * from get_stream_messages($1, $2, $3)',
      [streamName, String(fromPosition), maxCount]
    );
    return result.rows.map(fromDb<EventType>);
  }

  async getCategoryMessages<EventType extends MinimumEventType>(
    category: string,
    fromPosition: bigint,
    maxCount: number
  ): Promise<EventInStore<EventType>[]> {
    let prefix: string | undefined;
    let wildcard: boolean = category === '*';

    if (!wildcard) {
      prefix = prefixFromCategory(category);
      if (prefix === undefined && category.indexOf('-') !== -1) {
        throw new Error(`"${category}" is not a valid category.`);
      }
    }

    const parameters = [String(fromPosition), maxCount];
    if (!wildcard) {
      parameters.push(prefix || category);
    }

    const result = await this.pool.query(
      `SELECT
    id::varchar,
    stream_name::varchar,
    type::varchar,
    position::bigint,
    global_position::bigint,
    data::varchar,
    metadata::varchar,
    time::timestamp
  FROM
    messages
  WHERE
    ${
      wildcard ? '' : `${prefix ? 'prefix' : 'category'}(stream_name) = $3 AND `
    }
    global_position >= $1
  ORDER BY global_position ASC
  LIMIT $2`,
      parameters
    );
    return result.rows.map(fromDb<EventType>);
  }

  async getLastStreamMessage<EventType extends MinimumEventType>(
    streamName: string,
    type?: string
  ): Promise<EventInStore<EventType> | undefined> {
    const result = await this.pool.query(
      'select * from get_last_stream_message($1, $2)',
      [streamName, type || null]
    );
    return result.rows.map(fromDb<EventType>)[0];
  }

  async statisticsAtPosition(
    category: string,
    position: bigint
  ): Promise<StatisticsAtPosition> {
    const prefix = prefixFromCategory(category);
    if (prefix === undefined && category.indexOf('-') !== -1) {
      throw new Error(`"${category}" is not a valid category.`);
    }

    const [
      {
        rows: [{ count }],
      },
      {
        rows: [timeRow],
      },
    ] = await Promise.all([
      this.pool.query(
        `SELECT count(*)::int FROM messages
          WHERE ${prefix ? 'prefix' : 'category'}(stream_name) = $1
            AND global_position > $2
            LIMIT 10000`,
        [prefix || category, position]
      ),
      this.pool.query(
        `SELECT time::timestamp FROM messages
          WHERE ${prefix ? 'prefix' : 'category'}(stream_name) = $1
            AND global_position = $2`,
        [prefix || category, position]
      ),
    ]);

    if (count >= 10000) {
      console.error('StatisticsAtPosition: 10000 messages limit reached');
    }

    return {
      approximate_event_timestamp: timeRow ? new Date(timeRow.time) : undefined,
      approximate_event_count_after: count,
    };
  }
}

function fromDb<T extends MinimumEventType>(row: any): EventInStore<T> {
  const event: EventInStore = {
    id: row.id,
    stream_name: row.stream_name,
    time: new Date(row.time),
    type: row.type,
    data: JSON.parse(row.data),
    metadata: JSON.parse(row.metadata || 'null'),
    global_position: BigInt(row.global_position),
    position: BigInt(row.position),
  };

  return event as EventInStore<T>;
}
