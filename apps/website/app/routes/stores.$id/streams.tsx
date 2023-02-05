import { Table } from '../../modules/design-system/table';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { storeForIdentifier } from '../../modules/stores/factory';
import { UniqueCategory } from '../../modules/stores/single-category-store';

type StreamSummary = { name: string; position: string; last_time: string };
type LoaderData = {
  store_id: string;
  streams: StreamSummary[];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const store = storeForIdentifier(params.id!);
  const streams: Record<string, StreamSummary> = {};

  for await (const event of store.readCategory(
    UniqueCategory,
    0n,
    request.signal
  )) {
    streams[event.stream_name] = {
      name: event.stream_name,
      position: event.position.toString(),
      last_time: event.time.toISOString(),
    };
  }

  return json<LoaderData>({
    store_id: params.id!,
    streams: Object.values(streams),
  });
};

export default function Store() {
  const { streams, store_id } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <h2 className="text-lg font-medium text-gray-900">Streams</h2>

      <Table>
        <Table.Header>
          <Table.Header.Column>Stream</Table.Header.Column>
          <Table.Header.Column>Current position</Table.Header.Column>
          <Table.Header.Column>Last written in</Table.Header.Column>
          <Table.Header.Column></Table.Header.Column>
        </Table.Header>
        <Table.Body>
          {streams.map((stream) => (
            <tr>
              <Table.Column>{stream.name}</Table.Column>
              <Table.Column>{stream.position}</Table.Column>
              <Table.Column>{stream.last_time}</Table.Column>
              <Table.Column>
                <a
                  href={`/stores/${store_id}/streams/${encodeURIComponent(
                    stream.name
                  )}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View
                </a>
              </Table.Column>
            </tr>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
