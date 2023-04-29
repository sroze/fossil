import { ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { IEventStore } from 'event-store';
import {
  authorizeReadCategory,
  authorizeReadStream,
  authorizeWriteStream,
} from 'store-security';
import { HttpAuthenticator } from './http-authenticator';
import { StoreLocator } from 'store-locator';
import { MonitoredStore } from '../monitoring/monitored-store';

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

    return this.locate(storeId);
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

    return this.locate(storeId);
  }

  public async getStoreForWrite(
    storeId: string,
    request: Request,
    stream: string,
  ): Promise<IEventStore> {
    const payload = await this.authenticator.authenticate(storeId, request);
    if (!payload.write) {
      throw new ForbiddenException(
        'You are not authorized to write with this token.',
      );
    } else if (!authorizeWriteStream(payload.write, stream)) {
      throw new ForbiddenException(
        'You are not authorized to write in this stream with this token.',
      );
    }

    return this.locate(storeId);
  }

  private async locate(id: string): Promise<IEventStore> {
    const store = await this.storeLocator.locate(id);

    return new MonitoredStore(store, { store_id: id });
  }
}
