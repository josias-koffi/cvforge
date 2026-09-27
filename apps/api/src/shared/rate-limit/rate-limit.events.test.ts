import { HttpException, HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRateLimitStore } from "./rate-limit.memory-store";
import { RateLimitMiddleware } from "./rate-limit.middleware";

const START = 1_700_000_000_000;
const EVENTS_URL = "/public/events";

/** The funnel events route next to the ATS scan, on one shared store (US-132). */
describe("RateLimitMiddleware — funnel events", () => {
  let store: MemoryRateLimitStore;
  let middleware: RateLimitMiddleware;
  let next: ReturnType<typeof vi.fn>;
  let response: { setHeader: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    for (const name of [
      "ATS_PUBLIC_HOURLY_LIMIT",
      "ATS_PUBLIC_DAILY_LIMIT",
      "ATS_PUBLIC_DAILY_BUDGET",
      "PUBLIC_EVENTS_HOURLY_LIMIT",
      "PUBLIC_EVENTS_DAILY_LIMIT",
      "PUBLIC_EVENTS_DAILY_BUDGET",
    ]) {
      delete process.env[name];
    }

    store = new MemoryRateLimitStore();
    middleware = new RateLimitMiddleware(store, () => START);
    next = vi.fn();
    response = { setHeader: vi.fn() };
  });

  function send(url: string, ip = "203.0.113.7") {
    try {
      middleware.use(
        { headers: { "x-forwarded-for": ip }, url },
        response,
        next,
      );
      return null;
    } catch (error) {
      return error as HttpException;
    }
  }

  it("lets 60 events an hour through, and answers 429 after", () => {
    for (let index = 0; index < 60; index += 1) {
      expect(send(EVENTS_URL)).toBeNull();
    }

    expect(send(EVENTS_URL)?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", "3600");
  });

  it("never eats into the scan allowance, nor the scan budget", () => {
    for (let index = 0; index < 60; index += 1) {
      send(EVENTS_URL);
    }

    expect(send("/public/ats-scan")).toBeNull();
    expect(store.count("global:ats-scan", 86_400_000, START)).toBe(1);
  });

  it("keeps events flowing once the visitor spent their scans", () => {
    send("/public/ats-scan");
    send("/public/ats-scan");
    send("/public/ats-scan");

    expect(send("/public/ats-scan")?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(send(EVENTS_URL)).toBeNull();
  });

  it("answers 503 once the day's event budget is spent", () => {
    process.env.PUBLIC_EVENTS_DAILY_BUDGET = "2";
    middleware = new RateLimitMiddleware(store, () => START);

    send(EVENTS_URL, "203.0.113.1");
    send(EVENTS_URL, "203.0.113.2");

    expect(send(EVENTS_URL, "203.0.113.3")?.getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  /** A route wired without a policy of its own is throttled like a scan. */
  it("meters an undeclared path with the strictest policy", () => {
    send("/public/new-tool");
    send("/public/new-tool");
    send("/public/new-tool");

    expect(send("/public/new-tool")?.getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it("reads the events path whatever its case, as Express routes it", () => {
    for (let index = 0; index < 60; index += 1) {
      send("/Public/Events");
    }

    expect(store.count("global:ats-scan", 86_400_000, START)).toBe(0);
  });

  /** The landing translates the code; the French message is never shown (US-134). */
  it("names a refusal with a code", () => {
    send("/public/ats-scan");
    send("/public/ats-scan");
    send("/public/ats-scan");

    expect(send("/public/ats-scan")?.getResponse()).toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
