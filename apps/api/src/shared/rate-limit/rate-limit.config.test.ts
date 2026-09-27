import { describe, expect, it } from "vitest";
import { DAY_MS, HOUR_MS, resolveRateLimitConfig } from "./rate-limit.config";

describe("resolveRateLimitConfig", () => {
  it("defaults to 3 an hour, 10 a day, 300 across everyone", () => {
    const config = resolveRateLimitConfig({});

    expect(config.perIp).toEqual([
      { limit: 3, windowMs: HOUR_MS },
      { limit: 10, windowMs: DAY_MS },
    ]);
    expect(config.dailyBudget).toEqual({ limit: 300, windowMs: DAY_MS });
  });

  it("reads each limit from the environment", () => {
    const config = resolveRateLimitConfig({
      ATS_PUBLIC_DAILY_BUDGET: "500",
      ATS_PUBLIC_DAILY_LIMIT: "20",
      ATS_PUBLIC_HOURLY_LIMIT: "5",
    });

    expect(config.perIp[0]?.limit).toBe(5);
    expect(config.perIp[1]?.limit).toBe(20);
    expect(config.dailyBudget.limit).toBe(500);
  });

  /**
   * A typo in an env var must not silently open the door on a public AI route,
   * so anything unusable falls back to the default rather than to "no limit".
   */
  it.each([
    ["not a number", "abc"],
    ["zero", "0"],
    ["negative", "-5"],
    ["fractional", "2.5"],
    ["empty", ""],
  ])("falls back to the default for a %s value", (_label, value) => {
    expect(
      resolveRateLimitConfig({ ATS_PUBLIC_HOURLY_LIMIT: value }).perIp[0]?.limit,
    ).toBe(3);
  });
});
