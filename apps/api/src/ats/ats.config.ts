import { randomBytes } from "node:crypto";

export type AtsConfig = {
  /** Scans allowed across every visitor per rolling day; the cost stop-loss. */
  dailyBudget: number;
  /** Salt for `ip_hash`, so the stored hashes are not a rainbow table of IPv4. */
  ipHashSecret: string;
};

const DEFAULT_DAILY_BUDGET = 300;

/**
 * Same default as `resolveRateLimitConfig`, read from the same variable: the
 * middleware stops the traffic and this stops the spending, and the two
 * disagreeing would make the effective limit impossible to reason about.
 */
export function resolveAtsConfig(
  env: NodeJS.ProcessEnv = process.env,
): AtsConfig {
  const parsed = Number(env.ATS_PUBLIC_DAILY_BUDGET);

  return {
    dailyBudget:
      Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_BUDGET,
    // A per-process random salt when unset: hashes stop correlating across
    // restarts, which weakens forensics but never leaks an address. Set
    // ATS_IP_HASH_SECRET in production to keep them comparable.
    ipHashSecret:
      env.ATS_IP_HASH_SECRET?.trim() || randomBytes(32).toString("hex"),
  };
}
