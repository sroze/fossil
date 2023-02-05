import { EventInStore } from '../../event-store/interfaces';

export type EventOverTheWire = Omit<
  EventInStore,
  'position' | 'global_position' | 'time'
> & {
  time: string;
  position: string;
  global_position: string;
};

export const serializeEventInStoreForWire = ({
  position,
  global_position,
  time,
  ...rest
}: EventInStore): EventOverTheWire => ({
  ...rest,
  time: time.toISOString(),
  position: position.toString(),
  global_position: global_position.toString(),
});
