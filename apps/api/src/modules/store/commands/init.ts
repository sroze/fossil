import { Command, CommandRunner } from 'nest-commander';
import { Inject, Injectable } from '@nestjs/common';
import { aggregate as store } from '../domain/aggregate';
import { EskitService } from '../../../utils/eskit-nest';
import { RootStoreId } from '../constants';
import { generateToken } from 'store-security';
import { DateTime } from 'luxon';

@Injectable()
@Command({ name: 'init', description: 'Initialise a store' })
export class InitCommand extends CommandRunner {
  constructor(
    @Inject(store.symbol)
    private readonly service: EskitService<typeof store>,
  ) {
    super();
  }

  async run(): Promise<void> {
    let { state } = await this.service.read(RootStoreId);
    if (!state) {
      await this.service.execute(RootStoreId, {
        type: 'CreateStore',
        data: {
          name: 'Root',
        },
      });

      ({ state } = await this.service.readOrFail(RootStoreId));
      if (!state.management_key) {
        throw new Error(`Management key was not found.`);
      }

      console.log(`Store was already created.`);
    } else {
      console.log(`Store already exists.`);
    }

    console.log();
    console.log(`Here is the management key:`);
    console.log(
      await generateToken(state.management_key, {
        exp: DateTime.now().plus({ years: 10 }).valueOf() / 1000,
        fossil: {
          store_id: RootStoreId,
          management: ['*'],
        },
      }),
    );
    console.log();
  }
}
