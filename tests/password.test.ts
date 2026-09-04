import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('password hashing', () => {
  it('produces a scrypt-formatted hash with unique salt per call', () => {
    const h1 = hashPassword('secret123');
    const h2 = hashPassword('secret123');
    expect(h1).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(h1).not.toBe(h2); // unique salts
  });

  it('verifies the correct password', () => {
    const h = hashPassword('secret123');
    expect(verifyPassword('secret123', h)).toBe(true);
  });

  it('rejects a wrong password', () => {
    const h = hashPassword('secret123');
    expect(verifyPassword('wrong', h)).toBe(false);
  });

  it('rejects malformed stored hashes without throwing', () => {
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', 'md5$abc$def')).toBe(false);
    expect(verifyPassword('x', 'scrypt$notahexsalt$notahexhash')).toBe(false);
  });

  it('handles unicode and long passwords', () => {
    const h = hashPassword('密码测试🔒'.repeat(5));
    expect(verifyPassword('密码测试🔒'.repeat(5), h)).toBe(true);
    expect(verifyPassword('密码测试🔒'.repeat(4), h)).toBe(false);
  });
});
