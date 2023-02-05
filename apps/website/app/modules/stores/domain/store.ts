import { StoreCreated } from './events';

export type StoreState = {
  id: string;
  name: string;
};

export class Store {
  public state!: StoreState;

  constructor(events: StoreCreated[]) {
    this.apply(events);
  }

  apply(events: StoreCreated[]) {
    for (const { type, data } of events) {
      if (type === 'StoreCreated') {
        this.state = { id: data.store_id, name: data.name };
      }
    }
  }
}
