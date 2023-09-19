import { Request, Response } from 'express';

export const extractTokenFromRequest = (
  req: Request,
  storeId: string,
): string | null =>
  extractTokenFromAuthorizationHeader(req) ||
  extractTokenFromCookies(req, storeId);

/**
 * Extracts a JWT token from the `Authorization` header of an
 * HTTP request, if it can be found.
 */
export const extractTokenFromAuthorizationHeader = (
  req: Request,
): string | null => {
  const maybeAuthHeader = req.headers.authorization;

  if (maybeAuthHeader && maybeAuthHeader.startsWith('Bearer ')) {
    return maybeAuthHeader.replace(/Bearer /, '');
  }

  return null;
};

export const extractTokenFromCookies = (
  request: Request,
  storeId: string,
): string | null => {
  const cookieName = `fossil-${storeId}`;
  if (cookieName in request.cookies) {
    return request.cookies[cookieName];
  }

  return null;
};

export const addTokenToCookies = (
  response: Response,
  storeId: string,
  token: string,
): void => {
  response.cookie(`fossil-${storeId}`, token);
};
