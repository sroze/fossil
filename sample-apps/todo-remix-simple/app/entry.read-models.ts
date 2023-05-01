import { FossilStoreClient } from './config/client';
import { handle } from './read-models/to-dos';
import { EventInStoreDto } from 'fossil-api-client';
import { AnyTaskEvent } from './domain/events';

type PositionChangedEvent = {
  type: 'PositionChanged';
  data: {
    position: string;
  };
};

(async () => {
  const abortController = new AbortController();
  process.on('SIGINT', () => abortController.abort());
  process.on('SIGTERM', () => abortController.abort());

  const client = new FossilStoreClient();

  const offsetStream = `Offsets-TasksSubscription-v1`;
  const lastPosition = await client.head<PositionChangedEvent>(offsetStream);

  try {
    const stream = client.streamCategory<EventInStoreDto & AnyTaskEvent>(
      `Task`,
      lastPosition?.data.position,
      abortController.signal
    );

    console.log('Started consuming category "Task".');

    for await (const event of handle(stream)) {
      // Store the position in another stream, so we can get it when the script
      // starts again with `lastEvent`.
      await client.appendEvents<PositionChangedEvent>(offsetStream, [
        { type: 'PositionChanged', data: { position: event.global_position } },
      ]);
    }
  } catch (e) {
    console.log('Something happened, finishing.', e);
  }

  console.log('Finished.');
})();
