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

  /** Reads of our own copies, autocomplete included; the lead route sends mail. */
  it("meters the job market tool and its lead route apart (US-137)", () => {
    const market = policy("job-market", { PUBLIC_JOB_MARKET_DAILY_BUDGET: "900" });
    const lead = policy("job-market-lead");

    expect(market.perIp.map((rule) => rule.limit)).toEqual([120, 600]);
    expect(market.globalBudget).toEqual({
      key: "global:job-market",
      rule: { limit: 900, windowMs: DAY_MS },
    });
    expect(lead.perIp.map((rule) => rule.limit)).toEqual([5, 20]);
    expect(lead.globalBudget).toBeNull();
  });

  /** Every search and record is a call to the Annuaire des entreprises. */
  it("meters the employer check and its lead route apart (US-139)", () => {
    const check = policy("company-check", {
      PUBLIC_COMPANY_CHECK_HOURLY_LIMIT: "30",
    });
    const lead = policy("company-check-lead", {
      PUBLIC_COMPANY_CHECK_LEAD_DAILY_LIMIT: "8",
    });

    expect(check.perIp.map((rule) => rule.limit)).toEqual([30, 300]);
    expect(check.globalBudget).toEqual({
      key: "global:company-check",
      rule: { limit: 10_000, windowMs: DAY_MS },
    });
    expect(lead.perIp.map((rule) => rule.limit)).toEqual([5, 8]);
    expect(lead.globalBudget).toBeNull();
  });

  /** The one free tool that calls a model: as strict as the ATS scan. */
  it("meters the likely interview questions and their lead route apart (US-141)", () => {
    const questions = policy("interview-questions", {
      PUBLIC_INTERVIEW_QUESTIONS_DAILY_BUDGET: "120",
    });
    const lead = policy("interview-questions-lead");

    expect(questions.perIp).toEqual([
      { limit: 3, windowMs: HOUR_MS },
      { limit: 10, windowMs: DAY_MS },
    ]);
    expect(questions.globalBudget).toEqual({
      key: "global:interview-questions",
      rule: { limit: 120, windowMs: DAY_MS },
    });
    expect(lead.perIp.map((rule) => rule.limit)).toEqual([5, 20]);
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
    ["/public/job-market", "job-market"],
    ["/public/job-market/appellations", "job-market"],
    ["/Public/Job-Market/Lead/", "job-market-lead"],
    ["/public/company-check", "company-check"],
    ["/public/company-check/381983568", "company-check"],
    ["/public/company-check/lead", "company-check-lead"],
    ["/public/company-check/unknown/path", "scan"],
    ["/public/interview-questions", "interview-questions"],
    ["/Public/Interview-Questions/", "interview-questions"],
    ["/public/interview-questions/lead", "interview-questions-lead"],
    ["/public/interview-questions/other", "scan"],
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
      "public/job-market/{*splat}",
      "public/job-market",
      "public/company-check/{*splat}",
      "public/company-check",
      "public/interview-questions/{*splat}",
      "public/interview-questions",
      "public/ats-scan/{*splat}",
      "public/ats-scan",
    ]);
  });
});
