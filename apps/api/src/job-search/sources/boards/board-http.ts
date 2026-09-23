import { readRetryAfterMs, SourceRateLimiter } from "../source-rate-limiter";
import { BoardNotFoundError } from "./board.types";
import type { BoardProvider } from "./detect-board";

/**
 * The shared HTTP client for company job boards.
 *
 * These endpoints exist so a company can display its own openings on its own
 * site. None of them documents a rate limit, and Greenhouse's is "be
 * respectful or get blocked" — so every provider gets a limiter, a real
 * user agent, and a single read a day (ADR-023).
 */

/**
 * Identifies us, with a way to get in touch. An anonymous crawler is what
 * these providers block first.
 */
export const BOARD_USER_AGENT =
  "CVForgeJobBot/1.0 (+https://cvforge.fr/robot; contact@cvforge.fr)";

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_PAUSE_MS = 5_000;
const MAX_ATTEMPTS = 2;

/** Sustained pace per provider. Conservative where nothing is published. */
export const BOARD_REQUESTS_PER_SECOND: Record<BoardProvider, number> = {
  ashby: 2,
  greenhouse: 2,
  lever: 1,
  personio: 1,
  recruitee: 1,
  // Documented per IP: 10 a second in general, 2 on some endpoints.
  smartrecruiters: 2,
  welcomekit: 1,
  workable: 1,
};

export class BoardHttpClient {
  private readonly limiters = new Map<BoardProvider, SourceRateLimiter>();

  constructor(
    private readonly fetchImpl: typeof globalThis.fetch = globalThis.fetch,
    private readonly now: () => number = Date.now,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    /** Injected in tests, so a throttled board does not really sleep. */
    private readonly sleep?: (delayMs: number) => Promise<void>,
  ) {}

  /**
   * Reads a board's JSON. A 404 means the company is gone from that provider —
   * a distinct outcome from a failure, because it is what retires a registry
   * entry instead of merely counting an error against it.
   */
  async getJson<T>(provider: BoardProvider, url: string): Promise<T> {
    const limiter = this.limiterFor(provider);
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await limiter.run(() =>
          this.fetchImpl(url, {
            headers: { accept: "application/json", "user-agent": BOARD_USER_AGENT },
            signal: AbortSignal.timeout(this.timeoutMs),
          }),
        );

        if (response.status === 404 || response.status === 410) {
          throw new BoardNotFoundError(provider, url);
        }

        if (response.status === 429 || response.status >= 500) {
          limiter.pauseUntil(
            this.now() +
              readRetryAfterMs(
                response.headers.get("retry-after"),
                DEFAULT_PAUSE_MS,
                this.now(),
              ),
          );
          lastError = new Error(`${provider} answered ${response.status}.`);
          continue;
        }

        if (!response.ok) {
          throw new Error(`${provider} answered ${response.status}.`);
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof BoardNotFoundError) throw error;
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`${provider} could not be read.`);
  }

  private limiterFor(provider: BoardProvider): SourceRateLimiter {
    const existing = this.limiters.get(provider);
    if (existing) return existing;

    const limiter = new SourceRateLimiter({
      now: this.now,
      requestsPerSecond: BOARD_REQUESTS_PER_SECOND[provider],
      ...(this.sleep ? { sleep: this.sleep } : {}),
    });
    this.limiters.set(provider, limiter);

    return limiter;
  }
}
