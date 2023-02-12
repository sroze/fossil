import { Request } from 'express';

/**
 * Extracts a JWT token from the `Authorization` header of an
 * HTTP request, if it can be found.
 */
export const extractTokenFromRequest = (req: Request): string | null => {
  const maybeAuthHeader = req.headers.authorization;

  if (maybeAuthHeader && maybeAuthHeader.startsWith('Bearer ')) {
    return maybeAuthHeader.replace(/Bearer /, '');
  }

  return null;
};
