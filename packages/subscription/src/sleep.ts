import { AbortError } from './subscription';

export function sleep(time: number, signal?: AbortSignal): Promise<void> {
  return signal
    ? sleepWithSignal(time, signal)
    : new Promise((resolve) => setTimeout(resolve, time));
}

function sleepWithSignal(dueTime: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortError());
    }
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      if (signal.aborted) {
        onAbort();
        return;
      }
      resolve();
    }, dueTime);
    signal.addEventListener('abort', onAbort, { once: true });

    function onAbort() {
      clearTimeout(id);
      reject(new AbortError());
    }
  });
}
