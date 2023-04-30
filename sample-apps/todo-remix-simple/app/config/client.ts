import { storeApi } from '~/config/fossil';
import {
  EventInStoreDto,
  EventToWriteDto,
  WriteResultDto,
} from 'fossil-api-client';

type MinimumEventType = {
  type: string;
  data: object;
};

export class FossilStoreClient {
  constructor(
    private readonly storeId: string = process.env.FOSSIL_STORE_ID!
  ) {}

  async readStream<T = MinimumEventType>(
    stream: string
  ): Promise<{ events: Array<EventInStoreDto & T>; version: number }> {
    const {
      data: { items, pagination },
    } = await storeApi.readStream(this.storeId, stream);
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
    const { data } = await storeApi.appendEvents(this.storeId, {
      stream,
      events,
      expected_version: expectedVersion ? String(expectedVersion) : undefined,
    });

    return data;
  }
}
