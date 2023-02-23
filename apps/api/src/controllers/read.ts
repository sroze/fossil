import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { HttpAuthenticator } from '../services/http-authenticator';
import { Request } from 'express';
import { StoreLocator } from 'store-locator';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { authorizeRead } from 'store-security';
import { accumulate } from '../utils/streams';
import qs from 'querystring';
import { serializeEventInStoreForWire } from 'event-serialization';
import { Transform, Type } from 'class-transformer';

export class EventInStoreDto {}

/**
 * This pagination is heavily inspired from RFC 5005 which talks
 * about feed paging.
 *
 * @see https://www.rfc-editor.org/rfc/rfc5005
 */
class PaginationMetadata {
  @ApiPropertyOptional({
    description: 'URL containing the next page, if it exists.',
  })
  next?: string;
}

export class PaginatedEventList {
  @ApiProperty({
    type: [EventInStoreDto],
    description: 'The paginated list of events',
  })
  items: EventInStoreDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  pagination: PaginationMetadata;
}

class ReadStreamQueryParams {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  size = 50;

  @IsString()
  @IsOptional()
  from?: string;
}

@ApiTags('Store')
@Controller()
export class ReadController {
  constructor(
    private readonly authenticator: HttpAuthenticator,
    private readonly storeLocator: StoreLocator,
  ) {}

  @Get('stores/:id/streams/:stream/events')
  async stream(
    @Param('id') storeId: string,
    @Param('stream') stream: string,
    @Query() { size, from }: ReadStreamQueryParams,
    @Req() request: Request,
  ): Promise<PaginatedEventList> {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.read) {
      throw new ForbiddenException(
        'You are not authorized to read with this token.',
      );
    } else if (!authorizeRead(payload.read, stream)) {
      throw new ForbiddenException(
        'You are not authorized to read from this stream with this token.',
      );
    }

    const controller = new AbortController();
    request.on('close', () => {
      controller.abort('Request was closed.');
    });

    const store = await this.storeLocator.locate(storeId);
    const reader = store.readStream(
      stream,
      from ? BigInt(from) : 0n,
      controller.signal,
    );

    const items = await accumulate(reader, size);

    return {
      items: items.map(serializeEventInStoreForWire),
      pagination: {
        next:
          items.length < size
            ? undefined
            : request.path +
              '?' +
              qs.stringify({
                size: size,
                from: (items[items.length - 1].position + 1n).toString(),
              }),
      },
    };
  }
}
