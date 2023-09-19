import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import type { ManagementClaim, PrivateKey } from 'store-security';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { HttpAuthenticator } from '../services/http-authenticator';
import { Request } from 'express';
import { extractTokenFromRequest } from '../../../utils/express';
import { Pool } from 'pg';
import { SystemDatabasePool } from '../../../symbols';
import sql from 'sql-template-tag';
import { authorize, generateToken } from 'store-security';
import { DateTime } from 'luxon';

class ReadOrWriteClaims {
  @ApiProperty({
    isArray: true,
    type: String,
  })
  @IsString({ each: true })
  streams: string[];
}

class Claims {
  @ApiPropertyOptional()
  read: ReadOrWriteClaims;

  @ApiPropertyOptional()
  write: ReadOrWriteClaims;

  @ApiPropertyOptional({
    isArray: true,
    type: String,
    enum: ['keys', 'subscriptions', '*'],
  })
  @IsString({ each: true })
  management: ManagementClaim[];
}

class GenerateTokenRequest {
  @ApiProperty()
  @IsNotEmpty()
  claims: Claims;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  exp?: number;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'The key id to use to generate the token. If not provided, the token will be generated using the key used by the provided token.',
  })
  key_id?: string;
}

class GenerateTokenResponse {
  @ApiProperty()
  token: string;
}

@ApiTags('Store')
@Controller()
export class TokensController {
  constructor(
    private readonly authenticator: HttpAuthenticator,
    @Inject(SystemDatabasePool)
    private readonly pool: Pool,
  ) {}

  @Post('/stores/:storeId/tokens')
  @ApiOperation({
    summary: 'Generate a token',
    operationId: 'generateToken',
  })
  @ApiOkResponse({ type: GenerateTokenResponse })
  async generateToken(
    @Param('storeId') storeId: string,
    @Body() { claims, exp, key_id }: GenerateTokenRequest,
    @Req() req: Request,
  ): Promise<GenerateTokenResponse> {
    const {
      claims: { fossil: existingClaims, exp: existingExpiry },
      public_kid: existingPublicKid,
    } = await this.authenticator.authenticateToken(
      storeId,
      extractTokenFromRequest(req, storeId),
    );

    if (exp && existingExpiry && exp > existingExpiry) {
      throw new BadRequestException('The expiry time cannot be extended.');
    }

    if (!authorize(existingClaims, claims)) {
      throw new ForbiddenException(
        'You are not allowed to grant these permissions.',
      );
    }

    // Default to the current key.
    if (!key_id) {
      key_id = existingPublicKid;
    }

    if (
      key_id !== existingPublicKid &&
      (!existingClaims.management || !existingClaims.management.includes('*'))
    ) {
      throw new ForbiddenException(
        'You are not allowed to generate tokens for other keys.',
      );
    }

    // Fetch the key and ensure it's managed.
    const {
      rows: [row],
    } = await this.pool.query<{ private_key: PrivateKey }>(
      sql`SELECT private_key FROM keys WHERE store_id = ${storeId} AND (public_key_kid = ${key_id} OR key_id = ${key_id})`,
    );
    if (!row) {
      throw new BadRequestException(
        'The key used to generate the token is not managed by Fossil.',
      );
    }

    const tokenExpiry = exp
      ? exp
      : DateTime.now().plus({ hour: 1 }).valueOf() / 1000;

    // Validate that the claims are a subset of the existing claims.
    return {
      token: await generateToken(row.private_key, {
        exp: tokenExpiry,
        fossil: {
          ...claims,
          store_id: storeId,
        },
      }),
    };
  }
}
