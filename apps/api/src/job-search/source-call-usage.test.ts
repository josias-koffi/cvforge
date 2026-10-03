import { describe, expect, it, vi } from "vitest";
import { SourceCallCounter } from "./source-call-counter";
import {
  monthStartOf,
  resolveMonthlyQuotas,
  toCallUsage,
} from "./source-call-usage";

describe("toCallUsage", () => {
  it("raises the alert at 80 % of a known monthly quota", () => {
    expect(toCallUsage({ month: 7_999, today: 300 }, 10_000).quotaAlert).toBe(false);
    expect(toCallUsage({ month: 8_000, today: 300 }, 10_000)).toEqual({
      callsThisMonth: 8_000,
      callsToday: 300,
      monthlyQuota: 10_000,
      quotaAlert: true,
    });
  });

  it("never alerts without a quota, which is France Travail's case today", () => {
    expect(toCallUsage({ month: 1e9, today: 1 }, undefined)).toMatchObject({
      monthlyQuota: null,
      quotaAlert: false,
    });
    expect(toCallUsage(undefined, undefined).callsToday).toBe(0);
  });
});

describe("resolveMonthlyQuotas", () => {
  it("reads the France Travail quota only when one is set", () => {
    expect(resolveMonthlyQuotas({})).toEqual({});
    expect(
      resolveMonthlyQuotas({ FRANCE_TRAVAIL_OFFRES_MONTHLY_QUOTA: "100000" }),
    ).toEqual({ france_travail: 100_000 });
  });
});

describe("monthStartOf", () => {
  it("is the first of the month", () => {
    expect(monthStartOf("2026-10-17")).toBe("2026-10-01");
  });
});

describe("SourceCallCounter", () => {
  it("writes the calls of each source and Paris day in one go", async () => {
    const add = vi.fn(async () => {});
    // 23:30 UTC on 30 September is already 1 October in Paris.
    const counter = new SourceCallCounter(
      { add, totals: vi.fn() },
      () => Date.parse("2026-09-30T23:30:00Z"),
    );

    counter.add("france_travail");
    counter.add("france_travail");
    counter.add("lever");
    await counter.flush();
    await counter.flush();

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenCalledWith("france_travail", "2026-10-01", 2);
    expect(add).toHaveBeenCalledWith("lever", "2026-10-01", 1);
  });

  it("keeps the count for the next flush when the database fails", async () => {
    const add = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue(undefined);
    const counter = new SourceCallCounter({ add, totals: vi.fn() }, () => 0);

    counter.add("france_travail");
    await counter.flush();
    await counter.flush();

    expect(add).toHaveBeenLastCalledWith("france_travail", "1970-01-01", 1);
  });
});
