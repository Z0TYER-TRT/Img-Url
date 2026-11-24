import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Unguessable public id. 62^10 makes collisions negligible for a personal host. */
export function newId(length = 10): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i += 1) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}
