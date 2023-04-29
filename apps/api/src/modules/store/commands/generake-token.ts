import { Command, CommandRunner, Option } from 'nest-commander';
import { FossilClaims, generateToken } from 'store-security';
import set from 'lodash.set';
import { Inject, Injectable } from '@nestjs/common';
import { aggregate as store } from '../domain/aggregate';
import { EskitService } from '../../../utils/eskit-nest';
import { DateTime } from 'luxon';

interface CommandOptions {
  claim?: string[];
}

export function claimListToClaims(
  storeId: string,
  claimsList: string[],
): FossilClaims {
  const claims: FossilClaims = {
    store_id: storeId,
  };

  for (const claimString of claimsList) {
    const [claimName, claimValue] = claimString.split('=');
    if (!claimValue) {
      throw new Error(
        `Claim "${claimString}" is invalid. It must be in the form of "claimName=claimValue".`,
      );
    }

    set(claims, claimName, claimValue.split(','));
  }

  return claims;
}

@Injectable()
@Command({ name: 'generate-token', description: 'Generate a token' })
export class GenerateTokenCommand extends CommandRunner {
  constructor(
    @Inject(store.symbol)
    private readonly service: EskitService<typeof store>,
  ) {
    super();
  }

  async run([storeId]: string[], options?: CommandOptions): Promise<void> {
    if (!storeId) {
      throw new Error(`You need to pass the store identifier.`);
    }

    const claims = claimListToClaims(storeId, options?.claim ?? []);
    const { state } = await this.service.readOrFail(storeId);
    if (!state.management_key) {
      throw new Error(`Management key was not found.`);
    }

    const token = await generateToken(state.management_key, {
      exp: DateTime.now().plus({ years: 10 }).valueOf() / 1000,
      fossil: claims,
    });

    console.log(token);
  }

  @Option({
    flags: '-c, --claim <claim>',
    description: 'A claim to add to the token',
    // @ts-expect-error not supported by nest-commander
    defaultValue: [],
  })
  parseString(val: string, previous: string[]): string[] {
    return previous.concat(val);
  }
}
