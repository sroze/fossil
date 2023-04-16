import { ApiTags } from '@nestjs/swagger';
import axios, { AxiosRequestConfig } from 'axios';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  Inject,
  NotFoundException,
  NotImplementedException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpAuthenticator } from '../../store/services/http-authenticator';
import { authorizeReadCategory } from 'store-security';
import { v4, validate } from 'uuid';
import { subscriptionIdentifierFromQueueUrl } from '../utils/subscription-as-queue';
import { Pool } from 'pg';
import { SystemDatabasePool } from '../../../symbols';
import sql from 'sql-template-tag';

class BaseSQSAction {
  Action: string;
  QueueUrl: string;
  [other: string]: any;
}

const allowedSQSActions = [
  'ReceiveMessage',
  'ChangeMessageVisibility',
  'ChangeMessageVisibilityBatch',
  'DeleteMessage',
  'DeleteMessageBatch',
];

const SqsError = (
  type: 'Producer' | 'Sender',
  code: string,
  message: string,
) => `<ErrorResponse>
   <Error>
      <Type>${type}</Type>
      <Code>${code}</Code>
      <Message>${message}</Message>
   </Error>
   <RequestId>${v4()}</RequestId>
</ErrorResponse>`;

@ApiTags('Subscriptions')
@Controller()
export class ReceiveSubscriptionController {
  constructor(
    private readonly authenticator: HttpAuthenticator,
    @Inject(SystemDatabasePool)
    private readonly pool: Pool,
  ) {}

  @Post('/stores/:id/sqs/')
  async sqsEndpoint(
    @Param('id') storeId: string,
    @Body() { Action, QueueUrl, ...rest }: BaseSQSAction,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      if (!validate(storeId)) {
        throw new BadRequestException('Provided store identifier is invalid.');
      } else if (!('x-amz-security-token' in request.headers)) {
        throw new UnauthorizedException(
          'Token is expected to be provided in the "x-amz-security-token" header.',
        );
      } else if (!allowedSQSActions.includes(Action)) {
        throw new NotImplementedException(
          `Action "${Action}" is not allowed through Fossil's proxy.`,
        );
      }

      const token = Array.isArray(request.headers['x-amz-security-token'])
        ? request.headers['x-amz-security-token'][0]
        : request.headers['x-amz-security-token'];

      const claims = await this.authenticator.authenticateToken(storeId, token);
      if (!claims.read || claims.store_id !== storeId) {
        throw new ForbiddenException(
          'You are not authorized to read from this store with this token.',
        );
      }

      const subscriptionId = subscriptionIdentifierFromQueueUrl(QueueUrl);
      const {
        rows: [subscriptionMetadata],
      } = await this.pool.query<{
        subscription_category: string;
        sqs_queue_url: string;
      }>(
        sql`SELECT subscription_category, sqs_queue_url
            FROM sqs_subscriptions
            WHERE store_id = ${storeId} AND subscription_id = ${subscriptionId}`,
      );

      if (!subscriptionMetadata) {
        throw new NotFoundException(`Subscription was not found`);
      } else if (
        !authorizeReadCategory(
          claims.read,
          subscriptionMetadata.subscription_category,
        )
      ) {
        // TODO: We might want subscription-specific claims in the future?
        throw new ForbiddenException(
          `You are not authorized to read from the subscription\'s category with this token.`,
        );
      }

      const WaitTimeSeconds = rest.WaitTimeSeconds || 20; // 20s is the maximum.
      const config: AxiosRequestConfig = {
        responseType: 'stream',
        url: subscriptionMetadata.sqs_queue_url + '/',
        method: 'post',
        maxRedirects: 0,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: request.headers['accept'],
          'user-agent': undefined,
          'accept-encoding': request.headers['accept-encoding'],
        },
        validateStatus: (status: number) => true, // consider any request as successful.
        timeout: WaitTimeSeconds * 1000 + 500, // timeout 500ms after the `WaitTimeSeconds`.
        data: {
          ...rest,
          Action,
          WaitTimeSeconds,
          // FIXME: we'll need `AUTHPARAMS` when using AWS for real.
        },
      };

      const { status, headers, data: bodyStream } = await axios(config);
      response.status(status);
      response.set(headers);

      bodyStream.pipe(response);
    } catch (e) {
      if (e instanceof HttpException) {
        response.status(e.getStatus());
        response.set('content-type', 'application/xml');
        response.send(SqsError('Sender', 'Error', e.message));
      } else {
        response.status(500);
        response.set('content-type', 'application/xml');
        response.send(SqsError('Producer', 'Error', `Something went wrong.`));
      }
    }
  }
}
