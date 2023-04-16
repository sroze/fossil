import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Pool } from 'pg';
import { SystemDatabasePool } from '../../../symbols';
import sql from 'sql-template-tag';
import { HttpStoreLocator } from '../../store/services/http-store-locator';
import { Request } from 'express';
import { DurableSubscriptionFactory } from '../factory';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { WritableHeaderStream } from '@nestjs/core/router/sse-stream';
import { NdjsonStream } from '../utils/ndjson-stream';
import { serializeEventInStoreForWire } from 'event-serialization';

class PollQueryParams {
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

  // TODO: add a `from` parameter to allow resuming from a specific position. While
  //       this is not necessary, it would be nice to be able to have long-running
  //       consumers sending this back in parallel to the commit process, so we don't
  //       add unnecessary latency when not needed. We'd have to handle conflict when a
  //       consumer sends a position lower than the last known committed position, though.
}

class CommitBody {
  @ApiProperty({
    description: 'The position to commit to.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/)
  position: string;
}

@ApiTags('Subscriptions')
@Controller()
export class PollAndCommitSubscriptionController {
  constructor(
    @Inject(SystemDatabasePool)
    private readonly pool: Pool,
    private readonly storeLocator: HttpStoreLocator,
    private readonly durableSubscriptionFactory: DurableSubscriptionFactory,
  ) {}

  @Get('subscriptions/:subscriptionId/poll')
  async poll(
    @Param('subscriptionId') subscriptionId: string,
    @Query() { maxEvents, idleTimeout }: PollQueryParams,
    @Req() request: Request,
    @Res() res: WritableHeaderStream,
  ) {
    const { store, category } = await this.getStoreAndMetadataForSubscription(
      request,
      subscriptionId,
    );
    const subscription = this.durableSubscriptionFactory.readOnly(
      store,
      subscriptionId,
      category,
    );

    const controller = new AbortController();
    request.on('close', () => controller.abort());

    const stream = new NdjsonStream(request);
    stream.pipe(res, {});

    let idleTimeoutId: NodeJS.Timeout | undefined = setTimeout(
      () => controller.abort(),
      idleTimeout * 1000,
    );

    let numberOfEvents = 0;
    await subscription.start(async (event) => {
      clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => controller.abort(), idleTimeout * 1000);

      await stream.writeLine(serializeEventInStoreForWire(event));

      if (++numberOfEvents >= maxEvents) {
        controller.abort();
      }
    }, controller.signal);

    clearTimeout(idleTimeoutId);
    res.end();
  }

  @Put('subscriptions/:subscriptionId/commit')
  async commit(
    @Param('subscriptionId') subscriptionId: string,
    @Body() { position }: CommitBody,
    @Req() request: Request,
  ) {
    const { store, category } = await this.getStoreAndMetadataForSubscription(
      request,
      subscriptionId,
    );

    const subscription = this.durableSubscriptionFactory.readWrite(
      store,
      subscriptionId,
      category,
    );

    await subscription.commit(BigInt(position));
  }

  private async getStoreAndMetadataForSubscription(
    request: Request,
    subscriptionId: string,
  ) {
    // TODO: This can be cached in memory for future requests as it won't be able to change.
    const {
      rows: [row],
    } = await this.pool.query<{ store_id: string; category: string }>(
      sql`SELECT store_id, subscription_category as category
          FROM durable_subscriptions
           WHERE subscription_id = ${subscriptionId}`,
    );

    if (!row) {
      throw new NotFoundException('Subscription does not exist.');
    }

    const store = await this.storeLocator.getStoreForReadCategory(
      row.store_id,
      request,
      row.category,
    );

    return { store, category: row.category };
  }
}
