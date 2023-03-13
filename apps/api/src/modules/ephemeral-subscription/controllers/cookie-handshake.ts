import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { HttpAuthenticator } from '../../store/services/http-authenticator';
import {
  addTokenToCookies,
  extractTokenFromAuthorizationHeader,
} from '../../../utils/express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller()
export class CookieHandshakeController {
  constructor(private readonly authenticator: HttpAuthenticator) {}

  @ApiOperation({
    summary: "Sets Fossil token in the browser's cookie for SSE streams",
    description: `You can use browsers' built-in \`EventSource\` class to subscribe to Fossil events directly from your users' browser. However, most do not support setting HTTP headers for authorization. As such, you need to first use this endpoint to set your Fossil token as a Cookie, which will be later sent by the browser when subscribing.`,
  })
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
