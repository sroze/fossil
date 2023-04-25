import React from 'react';

export const ProfilePicture: React.FC<{ src: string }> = ({ src }) => (
  <img
    className="h-8 w-8 rounded-full"
    src={src}
    referrerPolicy="no-referrer"
  />
);
