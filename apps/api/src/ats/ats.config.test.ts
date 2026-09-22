import { describe, expect, it } from "vitest";
import { resolveAtsConfig } from "./ats.config";

describe("resolveAtsConfig", () => {
  it("defaults the daily budget to 300", () => {
    expect(resolveAtsConfig({}).dailyBudget).toBe(300);
  });

  it("reads the budget from the environment", () => {
    expect(
      resolveAtsConfig({ ATS_PUBLIC_DAILY_BUDGET: "50" }).dailyBudget,
    ).toBe(50);
  });

  /** A typo must not silently uncap a route that spends model credits. */
  it.each([
    ["not a number", "abc"],
    ["zero", "0"],
    ["negative", "-1"],
    ["fractional", "2.5"],
  ])("falls back to the default for a %s budget", (_label, value) => {
    expect(
      resolveAtsConfig({ ATS_PUBLIC_DAILY_BUDGET: value }).dailyBudget,
    ).toBe(300);
  });

  it("uses the configured salt for the address hash", () => {
    expect(resolveAtsConfig({ ATS_IP_HASH_SECRET: "pepper" }).ipHashSecret).toBe(
      "pepper",
    );
  });

  /**
   * Never an empty salt: hashing addresses unsalted would make the stored
   * hashes a lookup table of the IPv4 space.
   */
  it("invents a per-process salt when none is configured", () => {
    const first = resolveAtsConfig({}).ipHashSecret;
    const second = resolveAtsConfig({}).ipHashSecret;

    expect(first).toHaveLength(64);
    expect(first).not.toBe(second);
  });

  it("treats a blank salt as unset", () => {
    expect(resolveAtsConfig({ ATS_IP_HASH_SECRET: "   " }).ipHashSecret).toHaveLength(
      64,
    );
  });
});
