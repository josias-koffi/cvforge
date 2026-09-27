export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

/**
 * A sliding window of request timestamps.
 *
 * An interface rather than a concrete Map so the day this API runs on more than
 * one instance, a Redis-backed store replaces it without touching the
 * middleware. Redis is already provisioned in docker-compose and read nowhere
 * (ADR-022).
 */
export interface RateLimitStore {
  /** Hits recorded for this key inside the window ending at `now`. */
  count(key: string, windowMs: number, now: number): number;
  /** The oldest hit still inside the window — what `Retry-After` is derived from. */
  oldestHit(key: string, windowMs: number, now: number): number | null;
  record(key: string, now: number): void;
  /** Drops everything older than `before`; called opportunistically, never scheduled. */
  prune(before: number): void;
}

export const RATE_LIMIT_STORE = Symbol("RATE_LIMIT_STORE");

/**
 * The clock, as a token rather than a defaulted constructor parameter: Nest
 * builds middleware itself and tries to resolve every parameter, and a bare
 * function type gives the injector nothing to look up — the container then
 * refuses to boot (the same trap `SessionStateMiddleware` documents).
 */
export const RATE_LIMIT_CLOCK = Symbol("RATE_LIMIT_CLOCK");

export type Clock = () => number;

/**
 * How one public route is metered (US-132). The middleware applies the first
 * policy whose `matches` accepts the path, and the default one otherwise.
 */
export type RateLimitPolicy = {
  /** Namespaces the per-IP counters: `${name}:${ip}`. */
  name: string;
  /** The Nest route patterns `AppModule` applies the middleware to. */
  routes: string[];
  matches: (path: string) => boolean;
  /** Checked in order; the first rule exceeded answers 429. */
  perIp: RateLimitRule[];
  /** The shared counter that stops spending, or null for a route that spends nothing. */
  globalBudget: { key: string; rule: RateLimitRule } | null;
  limitedMessage: string;
  budgetMessage: string;
};
