import { InboxIcon } from '@heroicons/react/24/solid';

export const EmptyEventStream = () => (
  <div className="block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center mt-5 bg-white text-gray-600">
    <InboxIcon className="mx-auto h-10 w-10" />
    <span className="text-sm">
      There is nothing in there yet... Write an event!
    </span>
  </div>
);
