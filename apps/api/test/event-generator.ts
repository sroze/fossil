import { EventToWrite } from 'event-store';
import { v4 } from 'uuid';

const types = ['EventNumberOne', 'EventNumberTwo', 'AnotherEventType'];
export function generateEvent(): EventToWrite {
  return {
    id: v4(),
    type: types[Math.floor(types.length * Math.random())],
    data: {
      a_number: Math.round(Math.random() * 100),
      a_string: (Math.random() + 1).toString(36).substring(10),
    },
  };
}

export function generateEvents(count: number): EventToWrite[] {
  return new Array(count).fill(null).map(() => generateEvent());
}
