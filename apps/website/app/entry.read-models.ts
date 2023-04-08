import { main as subscription } from './read-models/subscription';
import { main as streams } from './read-models/streams';
import { main as stores } from './read-models/store';
import { main as orgs } from './read-models/orgs';
import { main as invitationAccepted } from '~/modules/organisations/invitations/processes/add-user-when-invite-is-accepted';
import { fossilEventStore, pool } from '~/config.backend';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

(async () => {
  await Promise.race([
    // read-models
    subscription(pool, fossilEventStore, abortController.signal),
    streams(pool, fossilEventStore, abortController.signal),
    stores(pool, fossilEventStore, abortController.signal),
    orgs(pool, fossilEventStore, abortController.signal),

    // async
    invitationAccepted(fossilEventStore, abortController.signal),
  ]);
})();
