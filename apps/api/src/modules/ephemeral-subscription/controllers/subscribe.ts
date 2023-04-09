import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  SseStream,
  WritableHeaderStream,
} from '@nestjs/core/router/sse-stream';
import { Req } from '@nestjs/common';
import {
  Subscription,
  InMemoryCheckpointStore,
  SubscribeTo,
} from 'subscription';
import { serializeEventInStoreForWire } from 'event-serialization';
import { EventInStore, IEventStore } from 'event-store';
import { HttpStoreLocator } from '../../store/services/http-store-locator';
import { Request } from 'express';

export const ServerSentEventsOperation = (): MethodDecorator &
  ClassDecorator => {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ): any => {
    ApiHeader({
      name: 'Last-Event-Id',
      schema: { type: 'string' },
      description:
        'Receive events only after this provided identifier. This is NOT the event identifier but the `id` property received in the SSE stream.',
    })(target, key, descriptor);

    ApiOkResponse({
      content: {
        'text/event-stream': {
          schema: {
            type: 'array',
            format: 'event-stream',
            properties: {
              id: { type: 'string' },
              event: { type: 'string', enum: ['event'] },
              data: { type: 'json', description: 'JSON-encoded event.' },
            },
          },
        },
      },
    })(target, key, descriptor);
  };
};

@ApiTags('Subscriptions')
@Controller()
export class SubscribeController {
  constructor(private readonly storeLocator: HttpStoreLocator) {}

  @ApiOperation({
    summary: "Server Sent Event (SSE) stream of this category's events",
  })
  @ServerSentEventsOperation()
  @Get('stores/:id/categories/:category/subscribe')
  async subscribeCategory(
    @Param('id') storeId: string,
    @Param('category') category: string,
    @Req() req: Request,
    @Res() res: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadCategory(
      storeId,
      req,
      category,
    );

    await this.streamAsServerSentEvents(store, req, res, { category });
  }

  @ApiOperation({
    summary: "Server Sent Event (SSE) stream of this stream's events",
  })
  @ServerSentEventsOperation()
  @Get('stores/:id/streams/:stream/subscribe')
  async subscribeStream(
    @Param('id') storeId: string,
    @Param('stream') stream: string,
    @Req() req: Request,
    @Res() res: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadStream(
      storeId,
      req,
      stream,
    );

    await this.streamAsServerSentEvents(store, req, res, { stream });
  }

  private async streamAsServerSentEvents(
    store: IEventStore,
    req: Request,
    res: WritableHeaderStream,
    subscribeTo: SubscribeTo,
  ) {
    let lastEventId = req.headers['last-event-id'];
    if (Array.isArray(lastEventId)) {
      lastEventId = lastEventId[0];
    }

    const manager = new Subscription(store, subscribeTo, {
      checkpointStore: new InMemoryCheckpointStore(
        lastEventId ? BigInt(lastEventId) : 0n,
      ),
    });

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
      res.end();
    });

    const stream = new SseStream(req);
    stream.pipe(res, {});

    const eventPositionResolver = (event: EventInStore) =>
      'category' in subscribeTo ? event.global_position : event.position + 1n;

    await manager.start((event) => {
      return new Promise<void>((resolve, reject) => {
        stream.writeMessage(
          {
            type: 'event',
            data: JSON.stringify(serializeEventInStoreForWire(event)),
            id: eventPositionResolver(event).toString(),
          },
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
      });
    }, controller.signal);
  }
}
