import { Request } from 'express';

export function signalForRequest(request: Request): AbortSignal {
  const controller = new AbortController();
  request.on('close', () => {
    controller.abort('Request was closed.');
  });

  return controller.signal;
}
