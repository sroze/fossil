import { OAuth2Profile } from 'remix-auth-oauth2';
import md5 from 'md5';

export type Profile = {
  id: string;
  displayName: string;
  email: string;
};

export function profileFromOAuthProfile(profile: OAuth2Profile): Profile {
  if (!profile.id) {
    throw new Error('Profile does not have an identifier.');
  }

  const email = profile.emails ? profile.emails[0]?.value : undefined;
  if (!email) {
    throw new Error('Profile does not have an email address.');
  }

  return {
    id: profile.id,
    email,
    displayName: profile.name?.givenName || profile.displayName || email,
  };
}

export function profilePictureUrl(profile: Profile): string {
  return `https://www.gravatar.com/avatar/${md5(profile.email)}`;
}
