import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { HttpAuthenticator } from '../services/http-authenticator';
import {
  addTokenToCookies,
  extractTokenFromAuthorizationHeader,
} from '../express-utils';

@Controller()
export class CookieHandshakeController {
  constructor(private readonly authenticator: HttpAuthenticator) {}

  @Post('stores/:id/cookie-handshake')
  async handshake(
    @Param('id') storeId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{}> {
    await this.authenticator.authenticate(storeId, request);

    addTokenToCookies(
      response,
      storeId,
      extractTokenFromAuthorizationHeader(request),
    );

    return {};
  }
}
