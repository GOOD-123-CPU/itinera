import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, resetRateLimiter } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => resetRateLimiter());

  it('allows requests under the limit', () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit('k1', 5, 60_000);
      expect(r.allowed).toBe(true);
    }
    expect(rateLimit('k1', 5, 60_000).allowed).toBe(false);
  });

  it('tracks different keys independently', () => {
    expect(rateLimit('a', 1, 60_000).allowed).toBe(true);
    expect(rateLimit('b', 1, 60_000).allowed).toBe(true);
    expect(rateLimit('a', 1, 60_000).allowed).toBe(false);
    expect(rateLimit('b', 1, 60_000).allowed).toBe(false);
  });

  it('reports retryAfterSec when blocked', () => {
    rateLimit('k2', 1, 60_000);
    const r = rateLimit('k2', 1, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(r.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('unblocks after the window expires', () => {
    vi_useFakeTimers();
    rateLimit('k3', 1, 1000);
    expect(rateLimit('k3', 1, 1000).allowed).toBe(false);
    vi_advanceTimersByTime(1100);
    expect(rateLimit('k3', 1, 1000).allowed).toBe(true);
    vi_useRealTimers();
  });
});

// Tiny local helpers so we don't need vi import gymnastics
import { vi } from 'vitest';
function vi_useFakeTimers() { vi.useFakeTimers(); }
function vi_advanceTimersByTime(ms: number) { vi.advanceTimersByTime(ms); }
function vi_useRealTimers() { vi.useRealTimers(); }
