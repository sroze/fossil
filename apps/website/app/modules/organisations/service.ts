import { createAggregate } from '~/utils/ddd';
import { fossilEventStore } from '~/config.backend';
import { decider } from './domain';
import { AnyOrganisationCommand } from '~/modules/organisations/commands';

export const organisation = (id: string) => {
  const aggregate = createAggregate(fossilEventStore, decider);

  return {
    read: () => aggregate.read(`Organisation-${id}`),
    write: (command: AnyOrganisationCommand) =>
      aggregate.write({}, `Organisation-${id}`, command),
  };
};
