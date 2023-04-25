import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { IEventStore } from 'event-store';

import { SystemStore } from '../../../symbols';
import { HttpAuthenticator } from '../../store/services/http-authenticator';
import { aggregate as sqsRelay } from '../domain/decider';
import { EskitService } from '../../../utils/eskit-nest';

class CreateSqsRelayBody {
  @ApiPropertyOptional({
    description: 'Identifier of the durable subscription to read from.',
  })
  @IsUUID()
  subscription_id: string;

  @ApiPropertyOptional({
    description:
      'URL of the SQS queue if one exists already. One will be created otherwise.',
  })
  @IsString()
  @IsOptional()
  queue_url?: string;
}

class SqsRelayCreatedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  global_position: string;
}

@ApiTags('SqsRelay')
@Controller()
export class SqsRelayManagement {
  constructor(
    @Inject(SystemStore)
    private readonly store: IEventStore,
    private readonly authenticator: HttpAuthenticator,
    @Inject(sqsRelay.symbol)
    private readonly service: EskitService<typeof sqsRelay>,
  ) {}

  @Post('stores/:id/sqs-relays')
  @ApiOperation({
    summary: 'Create a SQS relay',
    operationId: 'createSqsRelay',
  })
  @ApiOkResponse({ type: SqsRelayCreatedResponse })
  async create(
    @Param('id') storeId: string,
    @Body() { subscription_id, queue_url }: CreateSqsRelayBody,
    @Req() request: Request,
  ): Promise<SqsRelayCreatedResponse> {
    const claims = await this.authenticator.authenticate(storeId, request);
    if (!claims.management || !claims.management.includes('subscriptions')) {
      throw new ForbiddenException(
        'Forbidden to manage subscriptions on this store.',
      );
    }

    const id = subscription_id;
    const { global_position } = await this.service.execute(id, {
      type: 'CreateSqsRelay',
      data: {
        subscription_id,
        sqs_queue_url: queue_url,
      },
    });

    return { id, global_position: global_position.toString() };
  }
}
