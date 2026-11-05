import { SetMetadata } from "@nestjs/common";
import type { RateLimitRule } from "./rate-limit.types";

export const USER_RATE_LIMIT = "userRateLimit";

export type UserRateLimit = {
  /** Namespaces the counter: routes sharing a name share an allowance. */
  name: string;
  rules: RateLimitRule[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Caps how often one signed-in account may call an expensive route (a model
 * call, an OCR run, a page fetch). Credits already bound what an account can
 * spend; this bounds how fast, and how much a stolen session or a script can
 * run up before anyone notices. Enforced by `SessionGuard`.
 */
export const UserRateLimit = (name: string, hourly: number, daily: number) =>
  SetMetadata(USER_RATE_LIMIT, {
    name,
    rules: [
      { limit: hourly, windowMs: HOUR_MS },
      { limit: daily, windowMs: DAY_MS },
    ],
  } satisfies UserRateLimit);
