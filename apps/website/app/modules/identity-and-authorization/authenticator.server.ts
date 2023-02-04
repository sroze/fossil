import { Authenticator } from 'remix-auth';
import { Auth0Profile, Auth0Strategy } from 'remix-auth-auth0';
import { createCookieSessionStorage } from '@remix-run/node';

export const authenticationIsEnabled = (): boolean =>
  !!process.env.AUTH0_DOMAIN;

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '_session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: ['s3cr3t'], // FIXME
    secure: process.env.NODE_ENV === 'production',
  },
});

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<Auth0Profile>(sessionStorage);
authenticator.use(
  new Auth0Strategy(
    {
      callbackURL: 'http://localhost:3000/auth/callback', // FIXME:
      clientID: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      domain: process.env.AUTH0_DOMAIN!,
    },
    async ({ accessToken, refreshToken, extraParams, profile }) => {
      // Get the user data from your DB or API using the tokens and profile
      return profile;
    }
  ),
  'default'
);
