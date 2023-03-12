import { getSystemStore } from './app';
import { main as runner } from './runner/index';
import { main as manager } from './manager/index';

require('dotenv').config();

const abortController = new AbortController();

process.on('SIGINT', () => abortController.abort());
process.on('SIGTERM', () => abortController.abort());

(async () => {
  const store = getSystemStore();

  await Promise.race([
    runner(store, abortController.signal),
    manager(store, abortController.signal),
  ]);
})();
