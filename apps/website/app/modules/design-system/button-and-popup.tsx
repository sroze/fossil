import React, { useState } from 'react';
import { SecondaryButton } from './buttons';
import { Popup } from './popup';

export const ButtonAndPopup: React.FC<{ title: string }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SecondaryButton onClick={() => setOpen(true)}>{title}</SecondaryButton>
      <Popup open={open} onClose={() => setOpen(false)}>
        <div className="p-5">{children}</div>
      </Popup>
    </>
  );
};
