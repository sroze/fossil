import { aggregate as store, Store } from '../domain/aggregate';
import { INestApplication } from '@nestjs/common';
import { EskitService } from '../../../utils/eskit-nest';

export const createStore = async (app: INestApplication, storeId: string) => {
  const service = app.get<EskitService<typeof store>>(store.symbol);
  await service.execute(storeId, {
    type: 'CreateStore',
    data: { name: 'My store' },
  });
};
