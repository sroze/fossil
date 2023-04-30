import { FossilStoreClient } from './config/client';

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
  const stream = client.streamCategory(
    `Task`,
    lastPosition?.data.position,
    abortController.signal
  );

  for await (const event of stream) {
    console.log('received', event);

    // Store the position in another stream, so we can get it when the script
    // starts again with `lastEvent`.
    await client.appendEvents<PositionChangedEvent>(offsetStream, [
      { type: 'PositionChanged', data: { position: event.global_position } },
    ]);
  }

  // TODO: store the position in another stream.
})();
