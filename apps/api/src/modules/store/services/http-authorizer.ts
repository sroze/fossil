import { ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ManagementClaim } from 'store-security';
import { HttpAuthenticator } from './http-authenticator';

@Injectable()
export class HttpAuthorizer {
  constructor(private readonly authenticator: HttpAuthenticator) {}

  async authorize(
    storeId: string,
    request: Request,
    managementClaim: ManagementClaim,
  ): Promise<void> {
    const claims = await this.authenticator.authenticate(storeId, request);
    if (
      !claims.management ||
      (!claims.management.includes(managementClaim as ManagementClaim) &&
        !claims.management.includes('*'))
    ) {
      throw new ForbiddenException(
        'This token to create subscriptions on this store.',
      );
    }
  }
}
