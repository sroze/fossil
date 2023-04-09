import React from 'react';
import { H2 } from '~/modules/design-system/h2';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export const SectionHeader: React.FC<Props> = ({ title, subtitle, right }) => (
  <div className="flex flex-row items-center">
    <div className="flex-1">
      <H2>{title}</H2>
      {subtitle ? <div>{subtitle}</div> : null}
    </div>

    <div>{right}</div>
  </div>
);
