import type { RateLimitRule } from "./rate-limit.types";

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export type RateLimitConfig = {
  /** Checked in order; the first rule exceeded answers 429. */
  perIp: RateLimitRule[];
  /**
   * Unlocking is metered separately, and far more generously.
   *
   * It costs no parsing and no model call: it hands back a report already
   * computed, and it is the conversion this whole page exists to get. Sharing
   * the scan allowance meant a visitor who analysed three CVs could not open
   * any of them for an hour. Still capped, because it does send an email.
   */
  unlockPerIp: RateLimitRule[];
  /**
   * The stop-loss. Per-IP limits alone do not survive a botnet, and every scan
   * costs a model call — this caps the daily bill whatever the traffic shape.
   *
   * Charged by scans alone: an exhausted budget must never strand a visitor
   * holding a scan they cannot open.
   */
  dailyBudget: RateLimitRule;
};

const DEFAULT_HOURLY_LIMIT = 3;
const DEFAULT_DAILY_LIMIT = 10;
const DEFAULT_UNLOCK_HOURLY_LIMIT = 10;
const DEFAULT_UNLOCK_DAILY_LIMIT = 30;
const DEFAULT_DAILY_BUDGET = 300;

/** Pure and env-driven, like every other `resolve*Config` in the codebase. */
export function resolveRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitConfig {
  return {
    dailyBudget: {
      limit: readPositiveInt(env.ATS_PUBLIC_DAILY_BUDGET, DEFAULT_DAILY_BUDGET),
      windowMs: DAY_MS,
    },
    perIp: [
      {
        limit: readPositiveInt(env.ATS_PUBLIC_HOURLY_LIMIT, DEFAULT_HOURLY_LIMIT),
        windowMs: HOUR_MS,
      },
      {
        limit: readPositiveInt(env.ATS_PUBLIC_DAILY_LIMIT, DEFAULT_DAILY_LIMIT),
        windowMs: DAY_MS,
      },
    ],
    unlockPerIp: [
      {
        limit: readPositiveInt(
          env.ATS_UNLOCK_HOURLY_LIMIT,
          DEFAULT_UNLOCK_HOURLY_LIMIT,
        ),
        windowMs: HOUR_MS,
      },
      {
        limit: readPositiveInt(
          env.ATS_UNLOCK_DAILY_LIMIT,
          DEFAULT_UNLOCK_DAILY_LIMIT,
        ),
        windowMs: DAY_MS,
      },
    ],
  };
}

/**
 * A malformed value falls back to the default rather than disabling the limit:
 * a typo in an env var must not silently open the door on a public AI route.
 */
function readPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
