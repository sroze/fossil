import {ReadClaims, WriteClaims} from "./interfaces";

/**
 * Returns `true` is the claims authorize writing in this stream.
 *
 */
export function authorizeWrite({ streams }: WriteClaims, stream: string): boolean {
  return streams.includes('*') || streams.includes(stream);
}

/**
 * Returns `ture` is the claims authorize reading in this stream.
 *
 */
export function authorizeRead({ streams }: ReadClaims, stream: string): boolean {
  return streams.includes('*') || streams.includes(stream);
}
