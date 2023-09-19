import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { aggregate as store } from '../domain/aggregate';
import { EskitService } from '../../../utils/eskit-nest';
import { v4 } from 'uuid';
import { generateToken } from 'store-security';
import { DateTime } from 'luxon';
import { Request } from 'express';
import { HttpAuthorizer } from '../services/http-authorizer';
import { RootStoreId } from '../constants';

class CreateStoreRequest {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;
}

class CreateStoreResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  management_token: string;
}

@ApiTags('Management')
@Controller()
export class StoreManagementController {
  constructor(
    @Inject(store.symbol)
    private readonly service: EskitService<typeof store>,
    private readonly authorizer: HttpAuthorizer,
  ) {}

  @Post('stores')
  @ApiOperation({
    summary: 'Create a store',
    operationId: 'createStore',
  })
  @ApiOkResponse({ type: CreateStoreResponse })
  async create(
    @Body() { name, id: requestedId }: CreateStoreRequest,
    @Req() req: Request,
  ) {
    await this.authorizer.authorize(RootStoreId, req, '*');

    const id = requestedId || v4();
    await this.service.execute(id, {
      type: 'CreateStore',
      data: {
        name,
      },
    });

    const { state } = await this.service.readOrFail(id);
    if (!state.management_key) {
      throw new Error(`Management key was not found.`);
    }

    const managementToken = await generateToken(state.management_key, {
      exp: DateTime.now().plus({ years: 10 }).valueOf() / 1000,
      fossil: {
        store_id: id,
        management: ['*'],
      },
    });

    return {
      id,
      management_token: managementToken,
    };
  }
}
