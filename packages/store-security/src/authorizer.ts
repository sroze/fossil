import { ReadClaims, WriteClaims } from './interfaces';

const categoryFromStream = (stream: string): string => {
  const firstDashPosition = stream.indexOf('-');
  if (firstDashPosition === -1) {
    throw new Error(`Stream "${stream}" does not work.`);
  }

  return stream.substring(0, firstDashPosition);
};

function authorizeStream(
  { streams }: WriteClaims | ReadClaims,
  stream: string
): boolean {
  return (
    streams.includes('*') ||
    streams.includes(stream) ||
    streams.includes(`${categoryFromStream(stream)}-*`)
  );
}

/**
 * Returns `true` if the claims authorize writing in this stream.
 *
 */
export function authorizeWrite(claims: WriteClaims, stream: string): boolean {
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
  return streams.includes('*') || streams.includes(`${category}-*`);
}
