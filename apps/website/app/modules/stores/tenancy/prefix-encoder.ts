import { EventInStore } from '../../event-store/interfaces';

export class PrefixedStreamEventEncoder {
  constructor(private readonly prefix: string) {}

  public encodeStream(stream: string): string {
    return this.prefix + stream;
  }

  public decodeStream(stream: string): string {
    if (!stream.startsWith(this.prefix)) {
      throw new Error(`Stream cannot be decoded.`);
    }

    return stream.slice(this.prefix.length);
  }

  public decodeEvent({ stream_name, ...rest }: EventInStore): EventInStore {
    return {
      ...rest,
      stream_name: this.decodeStream(stream_name),
    };
  }
}
