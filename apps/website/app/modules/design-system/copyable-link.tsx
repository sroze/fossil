import React, { useState } from 'react';
import { Tooltip } from '~/modules/design-system/tooltip';
import { ClipboardDocumentIcon } from '@heroicons/react/24/solid';

export const CopyableLink = ({ href }: { href: string }) => {
  const [tooltipContent, setToolTipContent] = useState<string>('Copy');

  return (
    <div className="text-sm bg-gray-100 rounded-sm flex items-center">
      <div className="p-3 flex-1 text-left">{href}</div>
      <div
        className="hover:bg-white cursor-pointer p-1 rounded-md mr-2"
        onClick={async () => {
          await navigator.clipboard.writeText(href);
          setToolTipContent('Copied!');
        }}
      >
        <Tooltip message={tooltipContent}>
          <ClipboardDocumentIcon className="w-4 h-4 text-gray-500 inline-block" />
        </Tooltip>
      </div>
    </div>
  );
};
