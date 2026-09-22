import type { RateLimitStore } from "./rate-limit.types";

/**
 * A sliding window held in process memory.
 *
 * Single-instance by construction: the counters do not survive a restart and
 * are not shared between replicas. That is accepted for now — the API runs as
 * one container — and is the whole reason `RateLimitStore` is an interface
 * (ADR-022).
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  count(key: string, windowMs: number, now: number) {
    return this.within(key, windowMs, now).length;
  }

  oldestHit(key: string, windowMs: number, now: number) {
    return this.within(key, windowMs, now)[0] ?? null;
  }

  record(key: string, now: number) {
    this.hits.set(key, [...(this.hits.get(key) ?? []), now]);
  }

  /**
   * Called from the request path rather than on a timer: an interval would keep
   * the process alive in tests and hide a leak behind a schedule nobody reads.
   */
  prune(before: number) {
    for (const [key, timestamps] of this.hits) {
      const kept = timestamps.filter((timestamp) => timestamp > before);

      if (kept.length === 0) {
        this.hits.delete(key);
        continue;
      }

      this.hits.set(key, kept);
    }
  }

  private within(key: string, windowMs: number, now: number) {
    const floor = now - windowMs;

    return (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > floor,
    );
  }
}
