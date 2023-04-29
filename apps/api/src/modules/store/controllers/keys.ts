import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { aggregate as store } from '../domain/aggregate';
import { EskitService } from '../../../utils/eskit-nest';
import { generateKey } from 'store-security';
import { v4 } from 'uuid';
import { Request } from 'express';
import { HttpAuthorizer } from '../services/http-authorizer';
import { Pool } from 'pg';
import { SystemDatabasePool } from '../../../symbols';
import sql from 'sql-template-tag';

class CreateKeyRequest {
  @ApiProperty({
    description: 'The name of the key',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      "The type of the key. A `managed` key can be re-used by Fossil (because we store the private key) while the downloaded can only be used by the client (because we don't store the private key).",
    enum: ['managed', 'downloaded'],
  })
  @IsString()
  @IsEnum(['managed', 'downloaded'])
  type: 'managed' | 'downloaded';
}

class KeyItemResponse {
  @ApiProperty({
    description: 'The id of the key',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'The name of the key',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      "The type of the key. A `managed` key can be re-used by Fossil (because we store the private key) while the downloaded can only be used by the client (because we don't store the private key).",
    enum: ['managed', 'downloaded'],
  })
  @IsString()
  @IsEnum(['managed', 'downloaded'])
  type: 'managed' | 'downloaded';
}

class CreateKeyResponse {
  @ApiProperty({
    description: 'The id of the newly created key',
  })
  id: string;

  @ApiProperty({
    description:
      'The public key of the newly created key. Is it a JSON-serialized JWK.',
  })
  public_key: string;

  @ApiPropertyOptional({
    description:
      'The private key of the newly created key. Only present if the key is created as type `downloaded`.',
  })
  private_key?: string;
}

@ApiTags('Store')
@Controller()
export class KeysController {
  constructor(
    private readonly authorizer: HttpAuthorizer,
    @Inject(SystemDatabasePool)
    private readonly pool: Pool,
    @Inject(store.symbol)
    private readonly service: EskitService<typeof store>,
  ) {}

  @Get('stores/:storeId/keys')
  @ApiOperation({
    summary: 'List all keys',
    operationId: 'listKeys',
  })
  @ApiOkResponse({
    type: [KeyItemResponse],
  })
  async list(
    @Param('storeId') storeId: string,
    @Req() request: Request,
  ): Promise<KeyItemResponse[]> {
    await this.authorizer.authorize(storeId, request, 'keys');

    const { rows } = await this.pool.query<{
      id: string;
      name: string;
      type: 'managed' | 'downloaded';
    }>(
      sql`SELECT key_id as id, key_name as name,
            CASE WHEN private_key IS NOT NULL THEN 'managed' ELSE 'downloaded' END as type
          FROM keys
          WHERE store_id = ${storeId}`,
    );

    return rows;
  }

  @Post('stores/:storeId/keys')
  @ApiOperation({
    summary: 'Create a key',
    operationId: 'createKey',
  })
  @ApiOkResponse({ type: CreateKeyResponse })
  async create(
    @Param('storeId') storeId: string,
    @Body() { name, type }: CreateKeyRequest,
    @Req() request: Request,
  ): Promise<CreateKeyResponse> {
    await this.authorizer.authorize(storeId, request, 'keys');

    const id = v4();
    const key = await generateKey();
    await this.service.execute(storeId, {
      type: 'CreateKey',
      data: {
        key_id: id,
        name,
        public_key: key.public,
        private_key: type === 'managed' ? key.private : undefined,
      },
    });

    return {
      id,
      public_key: JSON.stringify(key.public),
      private_key:
        type === 'downloaded' ? JSON.stringify(key.private) : undefined,
    };
  }

  @Delete('stores/:storeId/keys/:keyId')
  @ApiOperation({
    summary: 'Delete a key',
    operationId: 'deleteKey',
  })
  async delete(
    @Param('storeId') storeId: string,
    @Param('keyId') keyId: string,
    @Req() request: Request,
  ) {
    await this.authorizer.authorize(storeId, request, 'keys');

    await this.service.execute(storeId, {
      type: 'DeleteKey',
      data: {
        key_id: keyId,
      },
    });
  }
}
