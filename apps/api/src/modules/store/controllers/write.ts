import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { EventToWrite, WrongExpectedVersionError } from 'event-store';
import { IsUUID, IsNotEmpty, IsJSON } from 'class-validator';
import { Request } from 'express';
import { authorizeWrite } from 'store-security';
import { StoreLocator } from 'store-locator';
import { HttpAuthenticator } from '../services/http-authenticator';
import { HttpStoreLocator } from '../services/http-store-locator';

class EventToWriteDto implements EventToWrite {
  @ApiPropertyOptional({
    description: 'Event identifier (UUID)',
  })
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'Event type',
  })
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Event payload (must be a JSON object)',
  })
  @IsJSON()
  data: object;
}

class WriteRequestDto {
  @IsNotEmpty()
  @ApiProperty({
    description: 'Stream name in which you want to write the events to.',
  })
  stream: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'Events to write',
    type: [EventToWriteDto],
  })
  events: EventToWriteDto[];

  @ApiPropertyOptional({
    description: 'The expected version number when writing in this stream.',
  })
  expected_version?: string;
}

class WriteResultDto {
  @ApiProperty({
    description: 'The resulting position of the stream',
  })
  position: string;

  @ApiProperty({
    description: 'The resulting position across the store',
  })
  global_position: string;
}

@ApiTags('Write')
@Controller()
export class WriteController {
  constructor(private readonly storeLocator: HttpStoreLocator) {}

  @Post('/stores/:id/events')
  @ApiOperation({
    summary: 'Write an event',
  })
  @ApiOkResponse({ type: WriteResultDto })
  async write(
    @Param('id') storeId: string,
    @Body() command: WriteRequestDto,
    @Req() request: Request,
  ): Promise<WriteResultDto> {
    const store = await this.storeLocator.getStoreForWrite(
      storeId,
      request,
      command.stream,
    );
    try {
      const result = await store.appendEvents(
        command.stream,
        command.events,
        command.expected_version ? BigInt(command.expected_version) : null,
      );

      return {
        position: result.position.toString(),
        global_position: result.global_position.toString(),
      };
    } catch (e) {
      if (e instanceof WrongExpectedVersionError) {
        throw new ConflictException(e);
      }

      throw e;
    }
  }
}
