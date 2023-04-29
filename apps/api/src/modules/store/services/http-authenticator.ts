import {
  FossilClaims,
  JwtPayloadWithFossil,
  TokenAuthenticator,
} from 'store-security';
import { Request } from 'express';
import { extractTokenFromRequest } from '../../../utils/express';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class HttpAuthenticator {
  constructor(private readonly tokenAuthenticator: TokenAuthenticator) {}

  async authenticate(storeId: string, request: Request): Promise<FossilClaims> {
    const token = extractTokenFromRequest(request, storeId);

    if (!token) {
      throw new UnauthorizedException(
        'You must bring a token to interact with this event store.',
      );
    }

    const {
      claims: { fossil },
    } = await this.authenticateToken(storeId, token);

    return fossil;
  }

  async authenticateToken(
    storeId: string,
    token: string,
  ): Promise<{ claims: JwtPayloadWithFossil; public_kid: string }> {
    try {
      return await this.tokenAuthenticator.authorize(storeId, token);
    } catch (e) {
      if (e instanceof Error) {
        throw new UnauthorizedException(e.message, { cause: e });
      }

      throw e;
    }
  }
}
