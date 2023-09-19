import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
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
import { IsString, MinLength } from 'class-validator';
import { HttpAuthenticator } from '../../store/services/http-authenticator';
import { v4 } from 'uuid';
import { aggregate as durableSubscription } from '../domain/aggregate';
import { EskitService } from '../../../utils/eskit-nest';

class CreateBody {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  category: string;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  name: string;
}

class SubscriptionCreatedResponse {
  @ApiProperty()
  id: string;

  // FIXME: make it better, through a pagination token or something?
  @ApiProperty()
  global_position: string;
}

@ApiTags('Subscriptions')
@Controller()
export class DurableSubscriptionManagementController {
  constructor(
    private readonly authenticator: HttpAuthenticator,
    @Inject(durableSubscription.symbol)
    private readonly service: EskitService<typeof durableSubscription>,
  ) {}

  @Post('stores/:id/subscriptions')
  @ApiOperation({
    summary: 'Create a durable subscription',
    operationId: 'createSubscription',
  })
  @ApiOkResponse({ type: SubscriptionCreatedResponse })
  async create(
    @Param('id') storeId: string,
    @Body() { category, name }: CreateBody,
    @Req() request: Request,
  ): Promise<SubscriptionCreatedResponse> {
    const claims = await this.authenticator.authenticate(storeId, request);
    if (!claims.management || !claims.management.includes('subscriptions')) {
      throw new ForbiddenException(
        'Forbidden to create subscriptions on this store.',
      );
    }

    const id = v4();
    const { global_position } = await this.service.execute(id, {
      type: 'CreateSubscription',
      data: {
        store_id: storeId,
        category,
        name,
      },
    });

    return { id, global_position: global_position.toString() };
  }
}
