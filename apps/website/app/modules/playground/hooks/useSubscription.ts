import { useEffect, useState } from 'react';

type EventSourceOptions = {
  init?: EventSourceInit;
};

export function useSubscription<T>(
  url: string | URL,
  { init }: EventSourceOptions = {}
): T[] {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    // rest data if dependencies change
    const list: T[] = [];
    setData(list);

    const eventSource = new EventSource(url, init);
    eventSource.addEventListener('event', handler);

    function handler({ data }: MessageEvent) {
      const event = JSON.parse(data);

      list.unshift(event);
      setData([...list]);
    }

    return () => {
      eventSource.removeEventListener('event', handler);
      eventSource.close();
    };
  }, [url, init]);

  return data;
}
