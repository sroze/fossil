import { factory as subscriptions } from './read-models/subscriptions';
import { main as streams } from './read-models/streams';
import { factory as stores } from './read-models/store';
import { factory as orgs } from './read-models/orgs';
import { main as invitationAccepted } from '~/modules/organisations/invitations/processes/add-user-when-invite-is-accepted';
import { fossilEventStore, pool } from '~/config.backend';
import { runSubscription } from '~/utils/subscription';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

(async () => {
  await Promise.race([
    // read-models
    runSubscription(
      subscriptions(fossilEventStore, pool),
      abortController.signal
    ),
    runSubscription(stores(fossilEventStore, pool), abortController.signal),
    runSubscription(orgs(fossilEventStore, pool), abortController.signal),
    streams(pool, fossilEventStore, abortController.signal),

    // async
    invitationAccepted(fossilEventStore, abortController.signal),
  ]);
})();
