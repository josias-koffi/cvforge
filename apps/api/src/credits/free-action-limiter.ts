import { HttpException, HttpStatus } from "@nestjs/common";
import { MemoryRateLimitStore } from "../shared/rate-limit/rate-limit.memory-store";
import type { RateLimitStore } from "../shared/rate-limit/rate-limit.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Actions that use the model but charge no credit. With no price, nothing but
 * this cap stops one account from looping on them.
 */
export const FREE_ACTION_DAILY_LIMITS = {
  cv_import: 20,
  cv_translation: 30,
} as const;

export type FreeAction = keyof typeof FREE_ACTION_DAILY_LIMITS;

const LIMITED_MESSAGE =
  "Vous avez atteint la limite quotidienne pour cette action gratuite. Reessayez demain.";

/**
 * A per-account daily cap on the free AI actions.
 *
 * Counted when the action starts, not when it succeeds, so a failing call
 * cannot be retried without end either. Held in memory like the public
 * routes' limiter (ADR-022): single instance, reset by a restart — a guard
 * against loops, not a quota.
 */
export class FreeActionLimiter {
  constructor(
    private readonly store: RateLimitStore = new MemoryRateLimitStore(),
    private readonly clock: () => number = Date.now,
    private readonly limits: Record<FreeAction, number> = FREE_ACTION_DAILY_LIMITS,
  ) {}

  assertWithinLimit(action: FreeAction, userEmail: string) {
    const key = `free:${action}:${userEmail.trim().toLowerCase()}`;
    const now = this.clock();

    this.store.prune(now - DAY_MS);

    if (this.store.count(key, DAY_MS, now) >= this.limits[action]) {
      throw new HttpException(LIMITED_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    this.store.record(key, now);
  }
}
