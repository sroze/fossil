import { createCookie } from '@remix-run/node';

export const lastKnownCheckpoint = createCookie('last-known-checkpoint');
