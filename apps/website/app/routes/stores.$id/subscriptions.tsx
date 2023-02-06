import { H2 } from '../../modules/design-system/h2';
import { Table } from '../../modules/design-system/table';

export default function Subscriptions() {
  // TODO: Create subscription by writing in `Subscription-{id}`
  // TODO: Have a list of subscriptions populated by a read-model (aka durable subcription)

  return (
    <div className="p-5">
      <H2>Durable subscriptions</H2>
      <div>
        Funnel events to other processes or systems automatically and in order.
      </div>

      <Table>
        <Table.Header>
          <tr>
            <Table.Header.Column>Key</Table.Header.Column>
            <Table.Header.Column>Type</Table.Header.Column>
            <Table.Header.Column>Status</Table.Header.Column>
            <Table.Header.Column>Lag</Table.Header.Column>
            <Table.Header.Column></Table.Header.Column>
          </tr>
        </Table.Header>
        <Table.Body>
          <tr>
            <Table.Column>
              <code>BillingV2</code>
            </Table.Column>
            <Table.Column>Poll</Table.Column>
            <Table.Column>
              <span className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                <svg
                  className="mr-1.5 h-2 w-2 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 8 8"
                >
                  <circle cx={4} cy={4} r={3} />
                </svg>
                Idle
              </span>
            </Table.Column>
            <Table.Column>
              <code>0</code>
            </Table.Column>
            <Table.Column>
              <a href="#" className="text-indigo-600 hover:text-indigo-900">
                More
              </a>
            </Table.Column>
          </tr>
        </Table.Body>
      </Table>
    </div>
  );
}
