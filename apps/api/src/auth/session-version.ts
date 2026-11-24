import { createHash } from 'node:crypto';

/**
 * Bumped implicitly whenever the admin password changes, so cookies minted
 * before the change stop working. Deterministic and never stored.
 */
export function sessionVersion(password: string): string {
  return createHash('sha256').update(password).digest('hex').slice(0, 12);
}
