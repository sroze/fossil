import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { accumulate } from '../../../utils/streams';
import qs from 'querystring';
import { serializeEventInStoreForWire } from 'event-serialization';
import { Type } from 'class-transformer';
import { signalForRequest } from '../../../utils/requests';
import { HttpStoreLocator } from '../services/http-store-locator';

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

class ReadQueryParams {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(1000)
  size = 50;

  @IsString()
  @IsOptional()
  from?: string;
}

@ApiTags('Store')
@Controller()
export class ReadController {
  constructor(private readonly storeLocator: HttpStoreLocator) {}

  @Get('stores/:id/streams/:stream/events')
  @ApiOperation({
    summary: 'List events from a stream',
    operationId: 'readStream',
  })
  @ApiOkResponse({ type: PaginatedEventList })
  async readStream(
    @Param('id') storeId: string,
    @Param('stream') stream: string,
    @Query() { size, from }: ReadQueryParams,
    @Req() request: Request,
  ): Promise<PaginatedEventList> {
    const store = await this.storeLocator.getStoreForReadStream(
      storeId,
      request,
      stream,
    );
    const reader = store.readStream(
      stream,
      from ? BigInt(from) : 0n,
      signalForRequest(request),
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

  @Get('stores/:id/streams/:stream/head')
  @ApiOperation({
    summary: 'Read the last event of a stream',
    operationId: 'streamHead',
  })
  @ApiOkResponse({ type: EventInStoreDto })
  async streamHead(
    @Param('id') storeId: string,
    @Param('stream') stream: string,
    @Req() request: Request,
  ): Promise<EventInStoreDto> {
    const store = await this.storeLocator.getStoreForReadStream(
      storeId,
      request,
      stream,
    );

    return serializeEventInStoreForWire(
      await store.lastEventFromStream(stream),
    );
  }

  @Get('stores/:id/categories/:category/events')
  @ApiOperation({
    summary: 'List events from a category',
    operationId: 'readCategory',
  })
  @ApiOkResponse({ type: PaginatedEventList })
  async category(
    @Param('id') storeId: string,
    @Param('category') category: string,
    @Req() request: Request,
    @Query() { size, from }: ReadQueryParams,
  ) {
    const store = await this.storeLocator.getStoreForReadCategory(
      storeId,
      request,
      category,
    );
    const reader = store.readCategory(
      category,
      from ? BigInt(from) : 0n,
      signalForRequest(request),
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
                // TODO: Why don't we `+ 1n` here?
                from: items[items.length - 1].global_position.toString(),
              }),
      },
    };
  }
}
