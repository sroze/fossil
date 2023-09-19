import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Request } from 'express';
import { WritableHeaderStream } from '@nestjs/core/router/sse-stream';
import { HttpStoreLocator } from '../../store/services/http-store-locator';
import { InMemoryCheckpointStore, Subscription } from 'subscription';
import { subscriptionAsNdjsonStream } from '../utils/ndjson-stream';

class PollParams {
  @ApiPropertyOptional({
    description: 'The maximum number of events to return.',
    default: 50,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxEvents = 50;

  @ApiPropertyOptional({
    description:
      'The maximum time to wait (in seconds) for new events before closing the connection.',
    default: 30,
  })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(0)
  @Max(30)
  idleTimeout = 30;

  @ApiPropertyOptional({
    description: `A position cursor. Will return events that are after this position in the store.`,
  })
  @IsString()
  @IsOptional()
  after?: string;
}

@ApiTags('Stream')
@Controller()
export class PollController {
  constructor(private readonly storeLocator: HttpStoreLocator) {}

  @Get('stores/:storeId/categories/:category/ndjson-stream')
  @ApiOperation({
    summary: 'Poll for events in a category.',
    operationId: 'pollCategory',
  })
  async pollCategory(
    @Param('storeId') storeId: string,
    @Param('category') category: string,
    @Query() { maxEvents, idleTimeout, after }: PollParams,
    @Req() request: Request,
    @Res() response: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadCategory(
      storeId,
      request,
      category,
    );

    const subscription = new Subscription(
      store,
      {
        category,
      },
      {
        checkpointStore: new InMemoryCheckpointStore(
          after ? BigInt(after) : 0n,
        ),
      },
    );

    await subscriptionAsNdjsonStream(
      request,
      response,
      subscription,
      maxEvents,
      idleTimeout,
    );
  }

  @Get('stores/:storeId/streams/:stream/ndjson-stream')
  @ApiOperation({
    summary: 'Poll for events in a stream.',
    operationId: 'pollStream',
  })
  async pollStream(
    @Param('storeId') storeId: string,
    @Param('stream') stream: string,
    @Query() { maxEvents, idleTimeout, after }: PollParams,
    @Req() request: Request,
    @Res() response: WritableHeaderStream,
  ) {
    const store = await this.storeLocator.getStoreForReadStream(
      storeId,
      request,
      stream,
    );

    const subscription = new Subscription(
      store,
      {
        stream,
      },
      {
        checkpointStore: new InMemoryCheckpointStore(
          // FIXME: This position weirdness has to stop, we need to fix it.
          after ? BigInt(after) + 1n : 0n,
        ),
      },
    );

    await subscriptionAsNdjsonStream(
      request,
      response,
      subscription,
      maxEvents,
      idleTimeout,
    );
  }
}
