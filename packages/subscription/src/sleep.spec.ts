import { sleep } from './sleep';

describe('Sleep', () => {
  it('can be interrupted by a signal', async () => {
    const controller = new AbortController();

    setTimeout(() => controller.abort(), 20);

    const start = performance.now();
    const result = await sleep(100, controller.signal);
    const timeTaken = performance.now() - start;

    expect(timeTaken).toBeLessThan(100);
    expect(result).toEqual('aborted');
  });
});
