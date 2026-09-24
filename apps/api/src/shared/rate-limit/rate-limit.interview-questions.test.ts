import { HttpException, HttpStatus } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_MS, HOUR_MS } from "./rate-limit.config";
import { MemoryRateLimitStore } from "./rate-limit.memory-store";
import { RateLimitMiddleware } from "./rate-limit.middleware";

const START = 1_700_000_000_000;
const QUESTIONS_URL = "/public/interview-questions";
const LEAD_URL = "/public/interview-questions/lead";

/**
 * The cost gate of sprint 030: the one free tool that calls a model, metered
 * per address and under a global daily budget before it goes live (US-141).
 */
describe("RateLimitMiddleware — likely interview questions", () => {
  let now: number;
  let store: MemoryRateLimitStore;
  let middleware: RateLimitMiddleware;
  let response: { setHeader: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.stubEnv("PUBLIC_INTERVIEW_QUESTIONS_DAILY_BUDGET", "");
    vi.stubEnv("PUBLIC_INTERVIEW_QUESTIONS_HOURLY_LIMIT", "");
    vi.stubEnv("PUBLIC_INTERVIEW_QUESTIONS_DAILY_LIMIT", "");
    now = START;
    store = new MemoryRateLimitStore();
    middleware = new RateLimitMiddleware(store, () => now);
    response = { setHeader: vi.fn() };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function send(url: string, ip = "203.0.113.7") {
    try {
      middleware.use(
        { headers: { "x-forwarded-for": ip }, url },
        response,
        () => undefined,
      );
      return null;
    } catch (error) {
      return error as HttpException;
    }
  }

  it("lets 3 requests an hour through per address, then answers 429", () => {
    for (let index = 0; index < 3; index += 1) {
      expect(send(QUESTIONS_URL)).toBeNull();
    }

    const refused = send(QUESTIONS_URL);

    expect(refused?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(refused?.getResponse()).toMatchObject({ code: "RATE_LIMITED" });
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", "3600");
  });

  it("stops an address at 10 a day, however spread out", () => {
    for (let index = 0; index < 10; index += 1) {
      expect(send(QUESTIONS_URL)).toBeNull();
      now += HOUR_MS;
    }

    expect(send(QUESTIONS_URL)?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("answers 503 with Retry-After once the day's budget is spent", () => {
    vi.stubEnv("PUBLIC_INTERVIEW_QUESTIONS_DAILY_BUDGET", "4");
    middleware = new RateLimitMiddleware(store, () => now);

    for (let index = 0; index < 4; index += 1) {
      expect(send(QUESTIONS_URL, `198.51.100.${index}`)).toBeNull();
      now += 60_000;
    }

    const refused = send(QUESTIONS_URL, "192.0.2.99");

    expect(refused?.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(refused?.getResponse()).toMatchObject({ code: "BUDGET_EXHAUSTED" });
    // The first of the four leaves the window a day after it was spent.
    expect(response.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      String((DAY_MS - 4 * 60_000) / 1000),
    );
  });

  it("keeps the budget at 300 a day by default", () => {
    for (let index = 0; index < 300; index += 1) {
      store.record("global:interview-questions", now);
    }

    expect(send(QUESTIONS_URL)?.getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it("never charges the lead route against the model budget", () => {
    for (let index = 0; index < 3; index += 1) {
      expect(send(LEAD_URL)).toBeNull();
    }

    expect(store.count("global:interview-questions", DAY_MS, now)).toBe(0);
    expect(send(QUESTIONS_URL)).toBeNull();
  });

  it("spends neither the ATS scan's budget nor its allowance", () => {
    send(QUESTIONS_URL);
    send(QUESTIONS_URL);
    send(QUESTIONS_URL);

    expect(store.count("global:ats-scan", DAY_MS, now)).toBe(0);
    expect(send("/public/ats-scan")).toBeNull();
  });
});
