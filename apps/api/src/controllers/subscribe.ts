import { Controller, Get, Param, Query, Res, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  SseStream,
  WritableHeaderStream,
} from '@nestjs/core/router/sse-stream';
import { Req } from '@nestjs/common';
import {
  Subscription,
  InMemoryCheckpointStore,
  CheckpointAfterNMessages,
} from 'subscription';
import { serializeEventInStoreForWire } from 'event-serialization';
import { EventInStore } from 'event-store';
import { IsOptional, IsString } from 'class-validator';
import { HttpStoreLocator } from '../services/http-store-locator';
import { Request } from 'express';

class SubscribeQueryParams {
  @IsString()
  @IsOptional()
  from?: string;
}

@ApiTags('Store')
@Controller()
export class SubscribeController {
  constructor(private readonly storeLocator: HttpStoreLocator) {}

  @Get('stores/:id/categories/:category/subscribe')
  async subscribeCategory(
    @Param('id') storeId: string,
    @Param('category') category: string,
    @Query() { from }: SubscribeQueryParams,
    @Req() req: Request,
    @Res() res: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadCategory(
      storeId,
      req,
      category,
    );

    await this.streamAsServerSentEvents(
      req,
      res,
      (position, signal) => store.readCategory(category, position, signal),
      (event: EventInStore) => event.global_position,
    );
  }

  @Get('stores/:id/streams/:stream/subscribe')
  async subscribeStream(
    @Param('id') storeId: string,
    @Param('stream') stream: string,
    @Query() { from }: SubscribeQueryParams,
    @Req() req: Request,
    @Res() res: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadStream(
      storeId,
      req,
      stream,
    );

    await this.streamAsServerSentEvents(
      req,
      res,
      (position, signal) => store.readStream(stream, position, signal),
      (event: EventInStore) => event.position + 1n,
    );
  }

  private async streamAsServerSentEvents(
    req: Request,
    res: WritableHeaderStream,
    streamFetcher: (position, signal) => AsyncIterable<EventInStore>,
    eventPositionResolver: (event: EventInStore) => bigint,
  ) {
    let lastEventId = req.headers['last-event-id'];
    if (Array.isArray(lastEventId)) {
      lastEventId = lastEventId[0];
    }

    const manager = new Subscription(
      new InMemoryCheckpointStore(lastEventId ? BigInt(lastEventId) : 0n),
      new CheckpointAfterNMessages(1),
    );

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
      res.end();
    });

    const stream = new SseStream(req);
    stream.pipe(res, {});

    await manager.subscribe(
      streamFetcher,
      eventPositionResolver,
      (event) => {
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
      },
      controller.signal,
    );
  }
}
