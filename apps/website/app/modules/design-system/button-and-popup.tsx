import React, { ReactNode, useState } from 'react';
import {
  ButtonVariant,
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from './buttons';
import { Popup } from './popup';

export const ButtonAndPopup: React.FC<{
  title: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode | ((args: { close: () => void }) => ReactNode);
}> = ({ title, variant, children, className }) => {
  const [open, setOpen] = useState(false);
  const Button =
    variant === 'primary'
      ? PrimaryButton
      : variant === 'danger'
      ? DangerButton
      : SecondaryButton;

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        {title}
      </Button>
      <Popup open={open} onClose={() => setOpen(false)}>
        <div className="p-5">
          {typeof children === 'function'
            ? children({ close: () => setOpen(false) })
            : children}
        </div>
      </Popup>
    </>
  );
};
