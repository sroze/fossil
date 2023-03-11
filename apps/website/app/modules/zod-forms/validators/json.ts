import { z } from 'zod';

function isJsonString(string: string) {
  try {
    JSON.parse(string);
  } catch (e) {
    return false;
  }

  return true;
}

export const zValidJsonAsString = z.custom<string>(
  (arg) => (arg ? (typeof arg === 'string' ? isJsonString(arg) : false) : true),
  { message: 'Must be a valid JSON object.' }
);
