import { describe, expect, it } from "vitest";
import { DAY_MS, HOUR_MS } from "./rate-limit.config";
import {
  rateLimitedRoutes,
  resolveRateLimitPolicies,
} from "./rate-limit.policies";

function policy(name: string, env: NodeJS.ProcessEnv = {}) {
  return resolveRateLimitPolicies(env).find((entry) => entry.name === name)!;
}

describe("resolveRateLimitPolicies", () => {
  it("keeps the ATS policies on their historical keys and variables", () => {
    const scan = policy("scan", { ATS_PUBLIC_DAILY_BUDGET: "500" });

    expect(scan.globalBudget).toEqual({
      key: "global:ats-scan",
      rule: { limit: 500, windowMs: DAY_MS },
    });
    expect(policy("unlock").globalBudget).toBeNull();
  });

  it("meters funnel events at 60 an hour, 300 a day, 20 000 across everyone", () => {
    const events = policy("events");

    expect(events.perIp).toEqual([
      { limit: 60, windowMs: HOUR_MS },
      { limit: 300, windowMs: DAY_MS },
    ]);
    expect(events.globalBudget).toEqual({
      key: "global:events",
      rule: { limit: 20_000, windowMs: DAY_MS },
    });
  });

  it("reads the event limits from their own variables", () => {
    const events = policy("events", {
      PUBLIC_EVENTS_DAILY_BUDGET: "1000",
      PUBLIC_EVENTS_DAILY_LIMIT: "50",
      PUBLIC_EVENTS_HOURLY_LIMIT: "10",
    });

    expect(events.perIp.map((rule) => rule.limit)).toEqual([10, 50]);
    expect(events.globalBudget?.rule.limit).toBe(1000);
  });

  /** No model call, but the PDF parsing is capped; the lead route sends mail. */
  it("meters the CV ↔ offer comparator and its lead route apart (US-136)", () => {
    const match = policy("keyword-match");
    const lead = policy("keyword-match-lead", {
      PUBLIC_KEYWORD_MATCH_LEAD_HOURLY_LIMIT: "2",
    });

    expect(match.perIp.map((rule) => rule.limit)).toEqual([10, 30]);
    expect(match.globalBudget).toEqual({
      key: "global:keyword-match",
      rule: { limit: 2_000, windowMs: DAY_MS },
    });
    expect(lead.perIp.map((rule) => rule.limit)).toEqual([2, 20]);
    expect(lead.globalBudget).toBeNull();
  });

  it("falls back to the default for an unusable event limit", () => {
    expect(
      policy("events", { PUBLIC_EVENTS_HOURLY_LIMIT: "-1" }).perIp[0]?.limit,
    ).toBe(60);
  });

  it.each([
    ["/public/events", "events"],
    ["/public/events/", "events"],
    ["/public/ats-scan/abc/unlock", "unlock"],
    ["/public/ats-scan/abc/unlock/", "unlock"],
    ["/public/ats-scan", "scan"],
    ["/public/keyword-match", "keyword-match"],
    ["/Public/Keyword-Match/", "keyword-match"],
    ["/public/keyword-match/lead", "keyword-match-lead"],
  ])("sends %s to the %s policy", (path, name) => {
    const matched = resolveRateLimitPolicies({}).find((entry) =>
      entry.matches(path),
    );

    expect(matched?.name).toBe(name);
  });

  /** A route wired without a policy of its own gets the strictest one. */
  it("ends with the ATS scan, which claims every path", () => {
    const policies = resolveRateLimitPolicies({});
    const last = policies[policies.length - 1]!;

    expect(last.name).toBe("scan");
    expect(last.matches("/public/anything-new")).toBe(true);
  });
});

describe("rateLimitedRoutes", () => {
  it("lists every declared route once, and only those", () => {
    expect(rateLimitedRoutes(resolveRateLimitPolicies({}))).toEqual([
      "public/events",
      "public/keyword-match/{*splat}",
      "public/keyword-match",
      "public/ats-scan/{*splat}",
      "public/ats-scan",
    ]);
  });
});
