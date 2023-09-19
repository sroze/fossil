import {
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
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
import type { WritableHeaderStream } from '@nestjs/core/router/sse-stream';
import {
  authorizeReadSubscription,
  authorizeWriteSubscription,
} from 'store-security';
import { HttpAuthenticator } from '../../store/services/http-authenticator';
import { subscriptionAsNdjsonStream } from '../../ephemeral-subscription/utils/ndjson-stream';
import { Type } from 'class-transformer';

class PollSubscriptionParams {
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
    private readonly authenticator: HttpAuthenticator,
    private readonly storeLocator: HttpStoreLocator,
    private readonly durableSubscriptionFactory: DurableSubscriptionFactory,
  ) {}

  @Get('stores/:storeId/subscriptions/:subscriptionId/poll')
  @ApiOperation({
    summary: 'Poll for events in a subscription.',
    operationId: 'poll',
  })
  async poll(
    @Param('storeId') storeId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Query() queryParams: PollSubscriptionParams,
    @Req() request: Request,
    @Res() response: WritableHeaderStream,
  ) {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.read) {
      throw new ForbiddenException(
        'You are not authorized to read with this token.',
      );
    } else if (!authorizeReadSubscription(payload.read, subscriptionId)) {
      throw new ForbiddenException(
        'You are not authorized to read from this category with this token.',
      );
    }

    const subscription = await this.durableSubscriptionFactory.readOnly(
      subscriptionId,
    );

    await subscriptionAsNdjsonStream(
      request,
      response,
      subscription,
      queryParams.maxEvents,
      queryParams.idleTimeout,
    );
  }

  @ApiOperation({
    summary: 'Commit a position in a subscription.',
    operationId: 'commit',
  })
  @Put('stores/:storeId/subscriptions/:subscriptionId/commit')
  async commit(
    @Param('storeId') storeId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body() { position }: CommitBody,
    @Req() request: Request,
  ) {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.write) {
      throw new ForbiddenException(
        'You are not authorized to write with this token.',
      );
    } else if (!authorizeWriteSubscription(payload.read, subscriptionId)) {
      throw new ForbiddenException(
        'You are not authorized to write to this subscription.',
      );
    }

    const subscription = await this.durableSubscriptionFactory.readWrite(
      subscriptionId,
    );

    await subscription.commit(BigInt(position));
  }
}
