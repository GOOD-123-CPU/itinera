/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Suitable for single-instance deployments. For horizontal scaling,
 * swap the store for Redis — the interface is intentionally tiny.
 */

interface WindowState {
  timestamps: number[];
}

const store = new Map<string, WindowState>();

// Periodically purge stale entries to avoid unbounded growth
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function maybeCleanup(now: number, windowMs: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, state] of store) {
    state.timestamps = state.timestamps.filter((t) => now - t < windowMs);
    if (state.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Check whether `key` may perform an action, given `limit` actions per
 * `windowMs` milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now, windowMs);

  const state = store.get(key) ?? { timestamps: [] };
  state.timestamps = state.timestamps.filter((t) => now - t < windowMs);

  if (state.timestamps.length >= limit) {
    const oldest = state.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, state);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  state.timestamps.push(now);
  store.set(key, state);
  return { allowed: true, remaining: limit - state.timestamps.length, retryAfterSec: 0 };
}

/** Reset all limits (used by tests). */
export function resetRateLimiter() {
  store.clear();
  lastCleanup = 0;
}
