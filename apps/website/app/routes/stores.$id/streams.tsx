import { Table } from '../../modules/design-system/table';
import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { H2 } from '../../modules/design-system/h2';
import { locator } from '~/modules/stores/locator';
import { pool } from '~/modules/event-store/store.backend';
import sql from 'sql-template-tag';

type StreamSummary = { name: string; position: string; last_time: string };
type LoaderData = {
  store_id: string;
  streams: StreamSummary[];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const { rows: streams } = await pool.query<StreamSummary>(
    sql`SELECT stream_name as name, position, last_written_in_at as last_time
        FROM store_streams
        WHERE store_id = ${params.id!}
        ORDER BY stream_name ASC`
  );

  return json<LoaderData>({
    store_id: params.id!,
    streams,
  });
};

export default function Store() {
  const { streams, store_id } = useLoaderData<LoaderData>();

  return (
    <div className="p-5">
      <H2>Streams</H2>

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Stream</Table.Header.Column>
            <Table.Header.Column>Current position</Table.Header.Column>
            <Table.Header.Column>Last written in</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          {streams.map((stream) => (
            <tr key={stream.name}>
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
