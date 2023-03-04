import { ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { IEventStore } from 'event-store';
import { authorizeReadCategory, authorizeReadStream } from 'store-security';
import { HttpAuthenticator } from './http-authenticator';
import { StoreLocator } from 'store-locator';

@Injectable()
export class HttpStoreLocator {
  constructor(
    private readonly authenticator: HttpAuthenticator,
    private readonly storeLocator: StoreLocator,
  ) {}

  public async getStoreForReadCategory(
    storeId: string,
    request: Request,
    category: string,
  ): Promise<IEventStore> {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.read) {
      throw new ForbiddenException(
        'You are not authorized to read with this token.',
      );
    } else if (!authorizeReadCategory(payload.read, category)) {
      throw new ForbiddenException(
        'You are not authorized to read from this category with this token.',
      );
    }

    return this.storeLocator.locate(storeId);
  }

  public async getStoreForReadStream(
    storeId: string,
    request: Request,
    stream: string,
  ): Promise<IEventStore> {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.read) {
      throw new ForbiddenException(
        'You are not authorized to read with this token.',
      );
    } else if (!authorizeReadStream(payload.read, stream)) {
      throw new ForbiddenException(
        'You are not authorized to read from this stream with this token.',
      );
    }

    return this.storeLocator.locate(storeId);
  }
}
