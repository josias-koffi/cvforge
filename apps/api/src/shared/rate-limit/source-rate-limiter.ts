/**
 * One rate limiter per external job source.
 *
 * Every source publishes — or tolerates — a different pace: France Travail
 * documents 3 to 10 calls a second, SmartRecruiters 2 to 10 per IP, Greenhouse
 * publishes nothing but blocks an IP that hammers it. Since the daily
 * collection fans out over many queries and many company boards, the limit has
 * to be enforced in one place rather than trusted to each adapter.
 *
 * A token bucket, not a fixed window: it lets a short burst through while
 * holding the average, which is what these APIs actually police.
 */

export interface RateLimiterOptions {
  /** Sustained pace. */
  requestsPerSecond: number;
  /** How many calls may go out back to back. Defaults to one second's worth. */
  burst?: number;
  /** Injected in tests so waiting neither sleeps for real nor drifts. */
  now?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
}

const MS_PER_SECOND = 1000;

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export class SourceRateLimiter {
  private readonly requestsPerSecond: number;
  private readonly burst: number;
  private readonly now: () => number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private tokens: number;
  private lastRefillAt: number;
  /** Set by `pauseUntil` when a source answered 429; nothing goes out before. */
  private blockedUntil = 0;
  /** Serialises waiters so two callers cannot spend the same token. */
  private queue: Promise<void> = Promise.resolve();

  constructor(options: RateLimiterOptions) {
    this.requestsPerSecond = Math.max(0.1, options.requestsPerSecond);
    this.burst = Math.max(1, options.burst ?? Math.ceil(this.requestsPerSecond));
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.tokens = this.burst;
    this.lastRefillAt = this.now();
  }

  /** Runs `task` once the source's pace allows it. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();

    return task();
  }

  /**
   * Holds every call on this source until `resumeAt`, after a 429 or a 503.
   * The source told us its pace; arguing with it only earns a longer ban.
   */
  pauseUntil(resumeAt: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, resumeAt);
  }

  private acquire(): Promise<void> {
    const waited = this.queue.then(() => this.waitForToken());
    // Failures never poison the queue: the next caller waits on a settled
    // promise, not on a rejected one.
    this.queue = waited.catch(() => undefined);

    return waited;
  }

  private async waitForToken(): Promise<void> {
    for (;;) {
      const now = this.now();
      const pause = this.blockedUntil - now;

      if (pause > 0) {
        await this.sleep(pause);
        continue;
      }

      this.refill(now);

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      const missing = 1 - this.tokens;
      await this.sleep(Math.ceil((missing / this.requestsPerSecond) * MS_PER_SECOND));
    }
  }

  private refill(now: number): void {
    const elapsedMs = Math.max(0, now - this.lastRefillAt);
    this.lastRefillAt = now;
    this.tokens = Math.min(
      this.burst,
      this.tokens + (elapsedMs / MS_PER_SECOND) * this.requestsPerSecond,
    );
  }
}

/**
 * Reads the pause a source asked for. `Retry-After` is either a number of
 * seconds or an HTTP date; anything else, and we fall back on `fallbackMs` so
 * a malformed header cannot turn into an instant retry storm.
 */
export function readRetryAfterMs(
  header: string | null | undefined,
  fallbackMs: number,
  now: number = Date.now(),
): number {
  const value = header?.trim();
  if (!value) return fallbackMs;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    // A negative delay is a broken header, not "retry in the past".
    return seconds >= 0 ? Math.round(seconds * MS_PER_SECOND) : fallbackMs;
  }

  const date = Date.parse(value);
  if (Number.isFinite(date)) {
    return Math.max(0, date - now);
  }

  return fallbackMs;
}
