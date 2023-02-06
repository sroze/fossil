import React, { useState } from 'react';
import {PrimaryButton, SecondaryButton} from './buttons';
import { Popup } from './popup';

export const ButtonAndPopup: React.FC<{ title: string; variant?: 'primary' | 'secondary' }> = ({
  title,
  variant,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const Button = variant === 'primary' ? PrimaryButton : SecondaryButton;

  return (
    <>
      <Button onClick={() => setOpen(true)}>{title}</Button>
      <Popup open={open} onClose={() => setOpen(false)}>
        <div className="p-5">{children}</div>
      </Popup>
    </>
  );
};
