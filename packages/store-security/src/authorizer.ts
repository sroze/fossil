import {
  FossilClaims,
  ManagementClaim,
  ReadClaims,
  WriteClaims,
} from './interfaces';
import { Category } from 'event-store';

function authorizeClaims(
  allowed: ReadClaims | WriteClaims | undefined,
  claims: ReadClaims | WriteClaims
): boolean {
  if (!allowed) {
    return false;
  }

  if (claims.streams) {
    for (const stream of claims.streams) {
      if (!authorizeStreamOrCategory(allowed, stream)) {
        return false;
      }
    }
  }

  if (claims.subscriptions) {
    for (const subscription of claims.subscriptions) {
      if (!allowed.subscriptions?.includes(subscription)) {
        return false;
      }
    }
  }

  return true;
}

function authorizeManagement(
  allowed: ManagementClaim[] | undefined,
  claims: ManagementClaim[]
): boolean {
  if (!allowed) {
    return false;
  }

  for (const claim of claims) {
    if (!allowed.includes(claim)) {
      return false;
    }
  }

  return true;
}

export function authorize(
  allowed: Omit<FossilClaims, 'store_id'>,
  claims: Omit<FossilClaims, 'store_id'>
): boolean {
  if (allowed?.management?.includes('*')) {
    return true;
  }

  if (claims.read && !authorizeClaims(allowed.read, claims.read)) {
    return false;
  }

  if (claims.write && !authorizeClaims(allowed.write, claims.write)) {
    return false;
  }

  if (
    claims.management &&
    !authorizeManagement(allowed.management, claims.management)
  ) {
    return false;
  }

  return true;
}

function authorizeStreamOrCategory(
  allowed: ReadClaims,
  streamOrCategory: string
) {
  if (streamOrCategory === '*') {
    return allowed.streams?.includes('*') || false;
  } else if (streamOrCategory.includes('*')) {
    return authorizeReadCategory(
      allowed,
      Category.fromStream(streamOrCategory).toString()
    );
  }

  return authorizeReadStream(allowed, streamOrCategory);
}

function authorizeStream(
  { streams }: WriteClaims | ReadClaims,
  stream: string
): boolean {
  if (!streams) {
    return false;
  }

  return (
    streams.includes('*') ||
    streams.includes(stream) ||
    streams.includes(`${Category.fromStream(stream).toString()}-*`)
  );
}

/**
 * Returns `true` if the claims authorize writing in this stream.
 *
 */
export function authorizeWriteStream(
  claims: WriteClaims,
  stream: string
): boolean {
  return authorizeStream(claims, stream);
}

/**
 * Returns `ture` if the claims authorize reading in this stream.
 *
 */
export function authorizeReadStream(
  claims: ReadClaims,
  stream: string
): boolean {
  return authorizeStream(claims, stream);
}

/**
 * Returns `true` if the claims authorize reading from the category.
 *
 */
export function authorizeReadCategory(
  { streams }: ReadClaims,
  category: string
): boolean {
  if (!streams) {
    return false;
  }

  return streams.includes('*') || streams.includes(`${category}-*`);
}

export function authorizeReadSubscription(
  { subscriptions }: ReadClaims,
  subscriptionId: string
): boolean {
  return subscriptions ? subscriptions.includes(subscriptionId) : false;
}

export function authorizeWriteSubscription(
  { subscriptions }: WriteClaims,
  subscriptionId: string
): boolean {
  return subscriptions ? subscriptions.includes(subscriptionId) : false;
}
