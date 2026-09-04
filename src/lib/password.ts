import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Password hashing using Node's built-in scrypt (no native deps required).
 *
 * Stored format: scrypt$<salt-hex>$<hash-hex>
 * - 16-byte random salt per password
 * - 64-byte derived key
 * - timing-safe comparison to prevent timing attacks
 */

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, hash] = parts;
    const candidate = scryptSync(password, salt, KEY_LENGTH);
    const expected = Buffer.from(hash, 'hex');
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}
