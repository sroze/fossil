import React, { ReactNode, useState } from 'react';
import {
  ButtonSize,
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
  size?: ButtonSize;
  children: ReactNode | ((args: { close: () => void }) => ReactNode);
}> = ({ title, variant, children, className, size }) => {
  const [open, setOpen] = useState(false);
  const Button =
    variant === 'primary'
      ? PrimaryButton
      : variant === 'danger'
      ? DangerButton
      : SecondaryButton;

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className} size={size}>
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
