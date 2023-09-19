import { fossilAxiosClient, storeApi, storeId } from './fossil';
import type {
  EventInStoreDto,
  EventToWriteDto,
  WriteResultDto,
} from 'fossil-api-client';
import { isAxiosError } from 'axios';

type MinimumEventType = {
  type: string;
  data: object;
};

export class FossilStoreClient {
  async readStream<T = MinimumEventType>(
    stream: string
  ): Promise<{ events: Array<EventInStoreDto & T>; version: number }> {
    const {
      data: { items, pagination },
    } = await storeApi.readStream(storeId, stream);
    if (pagination.next) {
      // TODO: handle pagination
      throw new Error(`Pagination is not yet implemented.`);
    }

    return {
      events: items as Array<EventInStoreDto & T>,
      version: Number(items[items.length - 1].position),
    };
  }

  async appendEvents<T = MinimumEventType>(
    stream: string,
    events: Array<T & EventToWriteDto>,
    expectedVersion?: number
  ): Promise<WriteResultDto> {
    const { data } = await storeApi.appendEvents(storeId, {
      stream,
      events,
      expected_version: expectedVersion ? String(expectedVersion) : undefined,
    });

    return data;
  }

  async head<T = MinimumEventType>(
    stream: string
  ): Promise<(EventInStoreDto & T) | undefined> {
    try {
      const { data } = await storeApi.streamHead(storeId, stream);

      return data as EventInStoreDto & T;
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) {
        return undefined;
      }

      throw e;
    }
  }

  async *streamCategory<T = MinimumEventType>(
    category: string,
    after: string | undefined,
    signal: AbortSignal
  ): AsyncGenerator<EventInStoreDto & T> {
    const { data: stream } = await fossilAxiosClient.get(
      `${
        process.env.FOSSIL_API_BASE_URL
      }/stores/${storeId}/categories/${encodeURIComponent(
        category
      )}/ndjson-stream`,
      {
        responseType: 'stream',
        signal,
        params: {
          ...(after ? { after } : {}),
        },
      }
    );

    for await (const chunk of stream) {
      const string = Buffer.from(chunk).toString().trim();
      if (!string) {
        continue;
      }

      for (const line of string.split('\n')) {
        yield JSON.parse(line);
      }
    }
  }
}
