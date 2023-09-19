export function sleep(
  time: number,
  signal?: AbortSignal
): Promise<void | 'aborted'> {
  return signal
    ? sleepWithSignal(time, signal)
    : new Promise((resolve) => setTimeout(resolve, time));
}

function sleepWithSignal(
  dueTime: number,
  signal: AbortSignal
): Promise<void | 'aborted'> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve('aborted');
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
      resolve('aborted');
    }
  });
}
